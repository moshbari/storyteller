require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const adminRoutes = require('./routes/admin');
const whopRoutes = require('./routes/whop');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());

// Whop webhook needs raw body — register BEFORE json middleware
app.use('/api/whop', whopRoutes);

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.log('❌ MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'StoryTeller is running! 🚀' });
});

// Serve welcome page at /welcome (without .html)
app.get('/welcome', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/welcome.html'));
});

// Serve pricing page at /pricing (without .html)
app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pricing.html'));
});

// Serve terms page at /terms (without .html)
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/terms.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 StoryTeller running on port ${PORT}`);
});
