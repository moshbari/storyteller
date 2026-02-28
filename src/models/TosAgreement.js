const mongoose = require('mongoose');

const tosAgreementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  tosVersion: { type: String, default: '1.0' },
  agreedAt: { type: Date, default: Date.now },
  plan: { type: String, default: 'free' },
  checkboxText: { type: String, default: '' }
});

// Index for quick lookups during disputes
tosAgreementSchema.index({ email: 1 });
tosAgreementSchema.index({ agreedAt: -1 });

module.exports = mongoose.model('TosAgreement', tosAgreementSchema);
