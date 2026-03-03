// Delete broken book and clean up
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./src/models/Book');
const fs = require('fs');
const path = require('path');

const BOOK_ID = '69a5006b4057503d3c00f6ce';

async function deleteBook() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const book = await Book.findById(BOOK_ID);
  if (!book) {
    console.log('❌ Book not found');
    process.exit(1);
  }

  console.log('📖 Deleting book:', book.title);

  // Delete from database
  await Book.findByIdAndDelete(BOOK_ID);
  console.log('✅ Deleted from database');

  // Clean up flipbook HTML if exists
  const flipbookDir = path.join(__dirname, 'public/flipbooks', BOOK_ID);
  if (fs.existsSync(flipbookDir)) {
    fs.rmSync(flipbookDir, { recursive: true });
    console.log('✅ Deleted flipbook files');
  }

  // Clean up images dir if exists
  const imgDir = path.join(__dirname, 'public/images', BOOK_ID);
  if (fs.existsSync(imgDir)) {
    fs.rmSync(imgDir, { recursive: true });
    console.log('✅ Deleted image files');
  }

  console.log('\n🎉 Done! Book completely removed.');
  await mongoose.disconnect();
}

deleteBook().catch(console.error);
