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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
module.exports.hashPassword = async function(password) {
  return bcrypt.hash(password, 10);
};
module.exports.comparePassword = async function(password, hash) {
  return bcrypt.compare(password, hash);
};
