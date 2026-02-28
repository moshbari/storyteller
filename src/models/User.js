const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  plan: { type: String, enum: ['free', 'basic', 'pro'], default: 'free' },
  booksCreated: { type: Number, default: 0 },
  booksLimit: { type: Number, default: 3 },
  active: { type: Boolean, default: true },
  whopMembershipId: { type: String, default: '' },
  whopEmail: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving (only if changed)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method on user instance
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
