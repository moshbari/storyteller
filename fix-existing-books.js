// fix-existing-books.js — One-time script to clean \' from existing books in MongoDB
// Run: node fix-existing-books.js
// Then delete this file

require('dotenv').config();
const mongoose = require('mongoose');

async function fixBooks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('books');

    const books = await collection.find({}).toArray();
    let fixed = 0;

    for (const book of books) {
      let needsUpdate = false;
      const updatedPages = book.pages.map(page => {
        if (page.text && (page.text.includes("\\'") || page.text.includes('\\"'))) {
          needsUpdate = true;
          return {
            ...page,
            text: page.text.replace(/\\'/g, "'").replace(/\\"/g, '"')
          };
        }
        return page;
      });

      if (needsUpdate) {
        await collection.updateOne(
          { _id: book._id },
          { $set: { pages: updatedPages } }
        );
        fixed++;
        console.log('  📖 Fixed:', book.title);
      }
    }

    console.log('\n🎯 Done! Fixed ' + fixed + ' out of ' + books.length + ' books.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixBooks();
