const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('📝 Signup attempt:', email);

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    // Just pass plain password — User model pre-save hook hashes it automatically
    const user = new User({ name, email, password });
    await user.save();
    console.log('✅ User created:', email);

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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Email not found' });

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

module.exports = router;
