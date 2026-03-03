// Diagnostic script for missing flipbook image
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./src/models/Book');
const fs = require('fs');
const path = require('path');

const BOOK_ID = '69a5006b4057503d3c00f6ce';

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const book = await Book.findById(BOOK_ID);
  if (!book) {
    console.log('❌ Book not found in database!');
    process.exit(1);
  }

  console.log('📖 Book:', book.title);
  console.log('📄 Total pages:', book.pages.length);
  console.log('');

  // Check each page's image
  book.pages.forEach((page, i) => {
    const imageUrl = page.imageUrl || 'NO IMAGE URL';
    let status = '❓';
    
    if (!page.imageUrl) {
      status = '❌ No imageUrl stored';
    } else if (page.imageUrl.startsWith('/images/')) {
      const localPath = path.join(__dirname, 'public', page.imageUrl);
      if (fs.existsSync(localPath)) {
        const size = fs.statSync(localPath).size;
        status = `✅ Local file exists (${(size/1024).toFixed(1)} KB)`;
      } else {
        status = `❌ Local file MISSING at ${localPath}`;
      }
    } else if (page.imageUrl.startsWith('http')) {
      status = '⚠️ External URL (may have expired)';
    }

    console.log(`Page ${i + 1}: ${status}`);
    console.log(`  URL: ${imageUrl}`);
    console.log('');
  });

  // Check flipbook HTML
  const flipbookPath = path.join(__dirname, 'public/flipbooks', BOOK_ID, 'index.html');
  if (fs.existsSync(flipbookPath)) {
    console.log('✅ Flipbook HTML exists');
    const html = fs.readFileSync(flipbookPath, 'utf8');
    // Extract the pages JSON from the flipbook
    const match = html.match(/const pages=(\[.*?\]);/);
    if (match) {
      const pages = JSON.parse(match[1]);
      console.log('\n📋 Flipbook embedded page data:');
      pages.forEach((p, i) => {
        console.log(`  Page ${p.num}: imageUrl = "${p.imageUrl || 'EMPTY'}"`);
      });
    }
  } else {
    console.log('❌ Flipbook HTML not found');
  }

  // Check images directory
  const imgDir = path.join(__dirname, 'public/images', BOOK_ID);
  if (fs.existsSync(imgDir)) {
    const files = fs.readdirSync(imgDir);
    console.log(`\n📁 Files in /public/images/${BOOK_ID}/:`);
    files.forEach(f => {
      const size = fs.statSync(path.join(imgDir, f)).size;
      console.log(`  ${f} (${(size/1024).toFixed(1)} KB)`);
    });
  } else {
    console.log(`\n❌ No images directory at /public/images/${BOOK_ID}/`);
  }

  await mongoose.disconnect();
}

diagnose().catch(console.error);
