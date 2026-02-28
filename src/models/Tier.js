const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  credits: { type: Number, required: true, default: 3 },
  features: [{ type: String }],
  artStyles: [{ type: String }],
  maxPages: { type: Number, default: 12 },
  downloads: {
    pdf: { type: Boolean, default: true },
    images: { type: Boolean, default: false },
    kdp: { type: Boolean, default: false },
    flipbook: { type: Boolean, default: false }
  },
  isDefault: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  highlight: { type: Boolean, default: false },
  badge: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tier', tierSchema);
