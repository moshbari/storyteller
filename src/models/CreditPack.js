const mongoose = require('mongoose');

const creditPackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  credits: { type: Number, required: true },
  price: { type: Number, required: true },
  savings: { type: String, default: '' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  highlight: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CreditPack', creditPackSchema);
