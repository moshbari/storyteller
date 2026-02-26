const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  pageNumber: Number,
  text: String,
  imagePrompt: String,
  imageUrl: String,
  imageProvider: String
});

const bookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  topic: { type: String, required: true },
  pages: [pageSchema],
  status: { type: String, enum: ['creating', 'completed', 'failed'], default: 'creating' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Book', bookSchema);
