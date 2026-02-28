const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Book = require('../models/Book');
const Tier = require('../models/Tier');
const CreditPack = require('../models/CreditPack');
const TosAgreement = require('../models/TosAgreement');
const bcrypt = require('bcryptjs');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'StoryAdmin2026!';

function adminAuth(req, res, next) {
  const pw = req.headers['x-admin-password'] || req.query.pw;
  if (pw !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ============================================
// STATS
// ============================================
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ active: { $ne: false } });
    const deactivatedUsers = await User.countDocuments({ active: false });
    const totalBooks = await Book.countDocuments({ status: 'completed' });
    const failedBooks = await Book.countDocuments({ status: 'failed' });

    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const booksToday = await Book.countDocuments({ createdAt: { $gte: todayStart }, status: 'completed' });
    const usersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const booksThisWeek = await Book.countDocuments({ createdAt: { $gte: weekStart }, status: 'completed' });

    const freePlan = await User.countDocuments({ plan: 'free' });
    const basicPlan = await User.countDocuments({ plan: 'basic' });
    const proPlan = await User.countDocuments({ plan: 'pro' });

    const geminiImages = await Book.aggregate([{ $unwind: '$pages' }, { $match: { 'pages.imageProvider': 'gemini' } }, { $count: 'total' }]);
    const fluxImages = await Book.aggregate([{ $unwind: '$pages' }, { $match: { 'pages.imageProvider': 'flux' } }, { $count: 'total' }]);
    const avgPages = await Book.aggregate([{ $match: { status: 'completed' } }, { $project: { pageCount: { $size: '$pages' } } }, { $group: { _id: null, avg: { $avg: '$pageCount' } } }]);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers, deactivated: deactivatedUsers, today: usersToday },
        books: { total: totalBooks, today: booksToday, thisWeek: booksThisWeek, failed: failedBooks },
        plans: { free: freePlan, basic: basicPlan, pro: proPlan },
        images: { gemini: geminiImages[0]?.total || 0, flux: fluxImages[0]?.total || 0 },
        avgPagesPerBook: Math.round((avgPages[0]?.avg || 0) * 10) / 10
      }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// USERS
// ============================================
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();
    const userIds = users.map(u => u._id);
    const bookCounts = await Book.aggregate([
      { $match: { userId: { $in: userIds }, status: 'completed' } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    bookCounts.forEach(b => { countMap[b._id.toString()] = b.count; });
    const enrichedUsers = users.map(u => ({ ...u, active: u.active !== false, actualBooks: countMap[u._id.toString()] || 0 }));
    res.json({ success: true, users: enrichedUsers });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users/:id/update', adminAuth, async (req, res) => {
  try {
    const { plan, booksLimit, credits } = req.body;
    const update = {};
    if (plan) update.plan = plan;
    if (booksLimit !== undefined) update.booksLimit = Number(booksLimit);
    if (credits !== undefined) update.credits = Number(credits);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users/:id/toggle-active', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.active = user.active === false ? true : false;
    await user.save();
    res.json({ success: true, active: user.active, message: user.active ? 'User activated' : 'User deactivated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Min 4 characters' });
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password: hash }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'Password reset for ' + user.email });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await Book.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User and their books deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// BOOKS
// ============================================
router.get('/books', adminAuth, async (req, res) => {
  try {
    const books = await Book.find({}).populate('userId', 'name email').sort({ createdAt: -1 }).lean();
    const simplifiedBooks = books.map(b => ({
      _id: b._id, title: b.title, topic: b.topic, status: b.status, pages: b.pages.length,
      imageProvider: b.pages[0]?.imageProvider || 'unknown',
      user: b.userId ? { name: b.userId.name, email: b.userId.email } : { name: 'Deleted', email: '' },
      createdAt: b.createdAt
    }));
    res.json({ success: true, books: simplifiedBooks });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/books/:id', adminAuth, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Book deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// TIERS (CRUD)
// ============================================
router.get('/tiers', adminAuth, async (req, res) => {
  try {
    const tiers = await Tier.find({}).sort({ order: 1 }).lean();
    res.json({ success: true, tiers });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/tiers', adminAuth, async (req, res) => {
  try {
    const { name, price, credits, features, artStyles, maxPages, downloads, highlight, badge, active } = req.body;
    const order = await Tier.countDocuments();
    const tier = await Tier.create({
      name, price: Number(price), credits: Number(credits),
      features: features || [], artStyles: artStyles || [],
      maxPages: Number(maxPages) || 12,
      downloads: downloads || { pdf: true, images: false, kdp: false, flipbook: false },
      highlight: highlight || false, badge: badge || '', active: active !== false, order
    });
    res.json({ success: true, tier });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/tiers/:id', adminAuth, async (req, res) => {
  try {
    const update = {};
    const fields = ['name','price','credits','features','artStyles','maxPages','downloads','highlight','badge','active','order'];
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    if (update.price !== undefined) update.price = Number(update.price);
    if (update.credits !== undefined) update.credits = Number(update.credits);
    if (update.maxPages !== undefined) update.maxPages = Number(update.maxPages);
    if (update.order !== undefined) update.order = Number(update.order);

    const tier = await Tier.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    res.json({ success: true, tier });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/tiers/:id', adminAuth, async (req, res) => {
  try {
    const tier = await Tier.findById(req.params.id);
    if (!tier) return res.status(404).json({ error: 'Tier not found' });
    if (tier.isDefault) return res.status(400).json({ error: 'Cannot delete the default free tier' });
    await Tier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Tier deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// CREDIT PACKS (CRUD)
// ============================================
router.get('/credit-packs', adminAuth, async (req, res) => {
  try {
    const packs = await CreditPack.find({}).sort({ order: 1 }).lean();
    res.json({ success: true, packs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/credit-packs', adminAuth, async (req, res) => {
  try {
    const { name, credits, price, savings, highlight, active } = req.body;
    const order = await CreditPack.countDocuments();
    const pack = await CreditPack.create({
      name, credits: Number(credits), price: Number(price),
      savings: savings || '', highlight: highlight || false,
      active: active !== false, order
    });
    res.json({ success: true, pack });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.put('/credit-packs/:id', adminAuth, async (req, res) => {
  try {
    const update = {};
    const fields = ['name','credits','price','savings','highlight','active','order'];
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    if (update.credits !== undefined) update.credits = Number(update.credits);
    if (update.price !== undefined) update.price = Number(update.price);
    if (update.order !== undefined) update.order = Number(update.order);

    const pack = await CreditPack.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!pack) return res.status(404).json({ error: 'Credit pack not found' });
    res.json({ success: true, pack });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete('/credit-packs/:id', adminAuth, async (req, res) => {
  try {
    await CreditPack.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Credit pack deleted' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// TOS AGREEMENTS (for dispute/chargeback proof)
// ============================================
router.get('/tos-agreements', adminAuth, async (req, res) => {
  try {
    const { email } = req.query;
    const query = email ? { email: email.toLowerCase().trim() } : {};
    const agreements = await TosAgreement.find(query).sort({ agreedAt: -1 }).lean();
    res.json({ success: true, count: agreements.length, agreements });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Quick lookup by email — returns formatted proof for disputes
router.get('/tos-proof/:email', adminAuth, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const agreements = await TosAgreement.find({ email }).sort({ agreedAt: -1 }).lean();
    const user = await User.findOne({ email }).select('-password').lean();
    
    if (!agreements.length) {
      return res.json({ success: false, message: 'No TOS agreement found for this email' });
    }

    res.json({
      success: true,
      proof: {
        user: user ? { name: user.name, email: user.email, plan: user.plan, createdAt: user.createdAt } : null,
        agreements: agreements.map(a => ({
          name: a.name,
          email: a.email,
          agreedAt: a.agreedAt,
          ipAddress: a.ipAddress,
          userAgent: a.userAgent,
          tosVersion: a.tosVersion,
          plan: a.plan,
          checkboxText: a.checkboxText
        })),
        summary: `User "${agreements[0].name}" (${email}) agreed to TOS v${agreements[0].tosVersion} on ${new Date(agreements[0].agreedAt).toUTCString()} from IP ${agreements[0].ipAddress}. Agreement checkbox stated: "${agreements[0].checkboxText}"`
      }
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================================
// PUBLIC PRICING (no auth — for user-facing page)
// ============================================
router.get('/public/pricing', async (req, res) => {
  try {
    const tiers = await Tier.find({ active: true }).sort({ order: 1 }).select('-__v').lean();
    const packs = await CreditPack.find({ active: true }).sort({ order: 1 }).select('-__v').lean();
    res.json({ success: true, tiers, packs });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
