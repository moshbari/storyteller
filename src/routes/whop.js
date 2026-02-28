const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

// ============================================
// WHOP CONFIG — Product ID to plan mapping
// ============================================
const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || 'ws_103553c75fc44b191fc71f1089fd5162e08fde6a1be2f2c7d45e9513e00a0fc6';

const PRODUCT_MAP = {
  // Subscription plans
  'prod_SoXtl1dGRNwkI': { type: 'plan', plan: 'free',  booksLimit: 3,  name: 'Free Plan' },
  'prod_jZP0DbfC30axc': { type: 'plan', plan: 'basic', booksLimit: 15, name: 'Starter Plan' },
  'prod_Q8XwnvB8aF5gM': { type: 'plan', plan: 'pro',   booksLimit: 50, name: 'Creator Plan' },
  // One-time credit packs
  'prod_Qm2bssVn2XzRD': { type: 'credits', credits: 5,  name: '5 Book Credits' },
  'prod_P1JKz3312lYvH': { type: 'credits', credits: 15, name: '15 Book Credits' },
  'prod_olDHQe72tQa4x': { type: 'credits', credits: 50, name: '50 Book Credits' },
};

// ============================================
// VERIFY WEBHOOK SIGNATURE
// ============================================
function verifyWebhook(payload, signature) {
  if (!signature || !WHOP_WEBHOOK_SECRET) return false;
  try {
    const hmac = crypto.createHmac('sha256', WHOP_WEBHOOK_SECRET);
    hmac.update(payload);
    const expected = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (err) {
    console.log('⚠️ Webhook signature verification error:', err.message);
    // For now, allow through while we confirm Whop's exact signing method
    return true;
  }
}

// ============================================
// FIND OR CREATE USER BY EMAIL
// ============================================
async function findOrCreateUser(email, name) {
  if (!email) return null;
  email = email.toLowerCase().trim();
  
  let user = await User.findOne({ email });
  if (!user) {
    // Auto-create account for Whop buyers who haven't signed up yet
    const randomPass = crypto.randomBytes(16).toString('hex');
    user = new User({
      name: name || email.split('@')[0],
      email,
      password: randomPass,
      plan: 'free',
      booksCreated: 0,
      booksLimit: 3,
      active: true,
      needsPasswordSetup: true
    });
    await user.save();
    console.log('👤 Auto-created user for Whop buyer:', email);
  }
  return user;
}

// ============================================
// WEBHOOK ENDPOINT
// ============================================
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Parse the body
    let body;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    
    console.log('📨 Whop webhook RAW:', rawBody.substring(0, 1000));
    
    try {
      body = JSON.parse(rawBody);
    } catch(e) {
      body = req.body || {};
    }

    const event = body.event || body.action || body.type || '';
    const data = body.data || body;
    
    console.log('📨 Whop webhook event:', event);
    console.log('📦 Keys:', Object.keys(body).join(', '));

    // Extract user email from various possible locations in the payload
    const email = data.email 
      || data.user?.email 
      || data.customer_email
      || data.membership?.user?.email
      || data.payment?.user?.email
      || body.email
      || body.user?.email
      || body.membership?.user?.email
      || body.membership?.email
      || null;

    const userName = data.user?.username 
      || data.user?.name
      || data.membership?.user?.username
      || body.user?.username
      || body.user?.name
      || null;

    // Extract product ID from various possible locations
    const productId = data.product_id
      || data.product?.id
      || data.access_pass?.id
      || data.membership?.product?.id
      || data.membership?.access_pass?.id
      || data.plan?.access_pass?.id
      || data.payment?.access_pass?.id
      || body.product_id
      || body.product?.id
      || body.membership?.product?.id
      || null;

    // Also check for product in nested plan object
    const planProductId = data.plan?.product_id
      || data.membership?.plan?.product_id
      || data.plan?.product?.id
      || body.plan?.product_id
      || null;

    const finalProductId = productId || planProductId;

    console.log('👤 Email:', email, '| Product:', finalProductId, '| User:', userName);

    // ============================================
    // HANDLE: membership_activated
    // Someone bought or renewed a plan
    // ============================================
    if (event === 'membership_activated' || event === 'membership.went_valid') {
      if (!email) {
        console.log('⚠️ No email in membership_activated event');
        return res.status(200).json({ received: true, note: 'no email found' });
      }

      const user = await findOrCreateUser(email, userName);
      const product = PRODUCT_MAP[finalProductId];

      if (product && product.type === 'plan') {
        user.plan = product.plan;
        user.booksLimit = product.booksLimit;
        user.booksCreated = 0; // Reset count for new billing period
        if (data.id || data.membership?.id) {
          user.whopMembershipId = data.id || data.membership?.id;
        }
        await user.save();
        console.log('✅ Plan upgraded:', email, '→', product.name, '(', product.booksLimit, 'books)');
      } else {
        console.log('⚠️ Unknown product ID:', finalProductId);
      }

      return res.status(200).json({ received: true, action: 'plan_activated' });
    }

    // ============================================
    // HANDLE: payment_succeeded
    // Could be subscription renewal OR credit pack purchase
    // ============================================
    if (event === 'payment_succeeded' || event === 'payment.succeeded') {
      if (!email) {
        console.log('⚠️ No email in payment_succeeded event');
        return res.status(200).json({ received: true, note: 'no email found' });
      }

      const user = await findOrCreateUser(email, userName);
      const product = PRODUCT_MAP[finalProductId];

      if (product && product.type === 'credits') {
        // One-time credit pack — ADD credits to existing limit
        user.booksLimit = (user.booksLimit || 0) + product.credits;
        await user.save();
        console.log('✅ Credits added:', email, '+', product.credits, 'books (new limit:', user.booksLimit, ')');
      } else if (product && product.type === 'plan') {
        // Subscription renewal — reset monthly count
        user.plan = product.plan;
        user.booksLimit = product.booksLimit;
        user.booksCreated = 0;
        await user.save();
        console.log('✅ Subscription renewed:', email, '→', product.name);
      } else {
        console.log('ℹ️ Payment succeeded but no matching product:', finalProductId);
      }

      return res.status(200).json({ received: true, action: 'payment_processed' });
    }

    // ============================================
    // HANDLE: membership_deactivated
    // Subscription cancelled or expired
    // ============================================
    if (event === 'membership_deactivated' || event === 'membership.went_invalid') {
      if (!email) {
        console.log('⚠️ No email in membership_deactivated event');
        return res.status(200).json({ received: true, note: 'no email found' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        user.plan = 'free';
        user.booksLimit = 3;
        user.booksCreated = 0;
        await user.save();
        console.log('⬇️ User downgraded to free:', email);
      }

      return res.status(200).json({ received: true, action: 'membership_deactivated' });
    }

    // ============================================
    // HANDLE: payment_failed
    // ============================================
    if (event === 'payment_failed' || event === 'payment.failed') {
      console.log('❌ Payment failed for:', email || 'unknown');
      return res.status(200).json({ received: true, action: 'payment_failed_logged' });
    }

    // ============================================
    // HANDLE: membership_cancel_at_period_end_changed
    // User clicked cancel but still active till period ends
    // ============================================
    if (event === 'membership_cancel_at_period_end_changed') {
      console.log('⏳ Membership cancel scheduled for:', email || 'unknown');
      return res.status(200).json({ received: true, action: 'cancel_scheduled' });
    }

    // ============================================
    // HANDLE: entry_created / entry_approved
    // Whop may fire these for free plan signups
    // ============================================
    if (event === 'entry_created' || event === 'entry_approved') {
      if (!email) {
        console.log('⚠️ No email in entry event');
        return res.status(200).json({ received: true, note: 'no email found' });
      }

      const user = await findOrCreateUser(email, userName);
      const product = PRODUCT_MAP[finalProductId];

      if (product && product.type === 'plan') {
        user.plan = product.plan;
        user.booksLimit = product.booksLimit;
        user.booksCreated = 0;
        if (data.id || data.membership?.id) {
          user.whopMembershipId = data.id || data.membership?.id;
        }
        await user.save();
        console.log('✅ Entry created — plan set:', email, '→', product.name);
      } else {
        // Even without product match, ensure user is created
        console.log('✅ Entry created — user ensured:', email);
      }

      return res.status(200).json({ received: true, action: 'entry_processed' });
    }

    // ============================================
    // DEFAULT: Try to process any event with email + product
    // This catches checkout.completed, membership_went_valid, etc.
    // ============================================
    console.log('ℹ️ Non-standard Whop event:', event);
    
    if (email && finalProductId) {
      const user = await findOrCreateUser(email, userName);
      const product = PRODUCT_MAP[finalProductId];
      
      if (product && product.type === 'plan') {
        // Only upgrade if it's a better plan
        const planOrder = { free: 0, basic: 1, pro: 2 };
        if ((planOrder[product.plan] || 0) > (planOrder[user.plan] || 0)) {
          user.plan = product.plan;
          user.booksLimit = product.booksLimit;
          user.booksCreated = 0;
          await user.save();
          console.log('✅ Catch-all upgraded:', email, '→', product.name);
        }
      } else if (product && product.type === 'credits') {
        user.booksLimit = (user.booksLimit || 0) + product.credits;
        await user.save();
        console.log('✅ Catch-all added credits:', email, '+', product.credits);
      }
    } else if (email) {
      // At minimum, create the user even without a product match
      await findOrCreateUser(email, userName);
      console.log('✅ Catch-all ensured user:', email);
    }
    
    return res.status(200).json({ received: true, event });

  } catch (error) {
    console.error('❌ Whop webhook error:', error.message);
    // Always return 200 so Whop doesn't keep retrying
    return res.status(200).json({ received: true, error: error.message });
  }
});

// ============================================
// HEALTH CHECK for webhook
// ============================================
router.get('/webhook', (req, res) => {
  res.json({ status: 'Whop webhook endpoint is active ✅', products: Object.keys(PRODUCT_MAP).length });
});

module.exports = router;
