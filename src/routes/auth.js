const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const TosAgreement = require('../models/TosAgreement');

const router = express.Router();

// Helper: Record TOS agreement
async function recordTosAgreement(user, req) {
  try {
    await TosAgreement.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      ipAddress: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      tosVersion: '1.0',
      plan: user.plan,
      checkboxText: 'I have read and agree to the Terms of Service, Privacy Policy, and Refund Policy.'
    });
    console.log('📋 TOS agreement recorded for:', user.email);
  } catch (err) {
    console.log('⚠️ TOS recording error:', err.message);
  }
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, tosAgreed } = req.body;
    console.log('📝 Signup attempt:', email);

    if (!tosAgreed) return res.status(400).json({ error: 'You must agree to the Terms of Service to continue' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    
    // If user was auto-created by Whop, let them complete signup
    if (existingUser && existingUser.needsPasswordSetup) {
      existingUser.name = name || existingUser.name;
      existingUser.password = password; // Pre-save hook will hash it
      existingUser.needsPasswordSetup = false;
      await existingUser.save();
      console.log('✅ Whop user completed signup:', email);

      await recordTosAgreement(existingUser, req);

      const token = jwt.sign({ id: existingUser._id, email: existingUser.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ message: 'Account activated! 🎉', token, user: { name: existingUser.name, email: existingUser.email, plan: existingUser.plan, booksLimit: existingUser.booksLimit } });
    }

    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    // Just pass plain password — User model pre-save hook hashes it automatically
    const user = new User({ name, email, password });
    await user.save();
    console.log('✅ User created:', email);

    await recordTosAgreement(user, req);

    if (user.active === false) return res.status(403).json({ error: "Your account has been deactivated. Contact support." });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Account created!', token, user: { name: user.name, email: user.email, plan: user.plan, booksLimit: user.booksLimit } });
  } catch (error) {
    console.log('❌ Signup error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ error: 'Email not found' });

    // If user was created by Whop and hasn't set password yet, tell them
    if (user.needsPasswordSetup) {
      return res.status(400).json({ error: 'Please set your password first', needsPasswordSetup: true });
    }

    // Use the instance method from User model
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: 'Wrong password' });

    if (user.active === false) return res.status(403).json({ error: "Your account has been deactivated. Contact support." });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Welcome back!', token, user: { name: user.name, email: user.email, plan: user.plan, booksLimit: user.booksLimit } });
  } catch (error) {
    console.log('❌ Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Set password for Whop-created accounts OR create new account
router.post('/set-password', async (req, res) => {
  try {
    const { email, password, name, tosAgreed } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!tosAgreed) return res.status(400).json({ error: 'You must agree to the Terms of Service to continue' });

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (user && !user.needsPasswordSetup) {
      return res.status(400).json({ error: 'Account already exists. Please log in instead.' });
    }

    if (user && user.needsPasswordSetup) {
      // Whop-created account — just set the password
      user.password = password;
      user.needsPasswordSetup = false;
      if (name && name.trim()) user.name = name.trim();
      await user.save();
      console.log('✅ Password set for Whop buyer:', email);
    } else {
      // No account exists — create one (came from Whop but webhook didn't fire)
      user = new User({
        name: (name && name.trim()) || email.split('@')[0],
        email: email.toLowerCase().trim(),
        password: password,
        plan: 'free',
        booksCreated: 0,
        booksLimit: 3,
        active: true,
        needsPasswordSetup: false
      });
      await user.save();
      console.log('✅ New account created from welcome page:', email);
    }

    // Record TOS agreement with IP, user agent, timestamp
    await recordTosAgreement(user, req);

    // Auto-login: return token
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'Welcome to StoryTeller! 🎉', 
      token, 
      user: { name: user.name, email: user.email, plan: user.plan, booksLimit: user.booksLimit } 
    });
  } catch (error) {
    console.log('❌ Set password error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
