require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Connect to Database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.log('❌ MongoDB error:', err));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'StoryTeller is running! 🚀' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StoryTeller running on port ${PORT}`);
});

