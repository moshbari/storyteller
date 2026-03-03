/**
 * MIGRATION SCRIPT: Move old local book images to Cloudflare R2
 * 
 * Run this ONCE on the server:
 * node migrate-images-to-r2.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ── R2 Setup ──────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const BUCKET = process.env.R2_BUCKET_NAME || 'storyteller-images';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

// ── Book Model (inline so we don't need full app) ─────────────────────────────
const pageSchema = new mongoose.Schema({
  pageNumber: Number,
  text: String,
  imagePrompt: String,
  imageUrl: String,
  imageProvider: String
});
const bookSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  topic: String,
  pages: [pageSchema],
  status: String,
  createdAt: Date
});
const Book = mongoose.model('Book', bookSchema);

// ── Local images directory on server ─────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, 'public', 'images');

// ── Upload one file to R2 ─────────────────────────────────────────────────────
async function uploadToR2(filePath, r2Key) {
  const buffer = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
    Body: buffer,
    ContentType: 'image/png'
  }));
  return PUBLIC_URL + '/' + r2Key;
}

// ── Main Migration ────────────────────────────────────────────────────────────
async function migrate() {
  console.log('\n🚀 Starting image migration to R2...\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find all books that still have LOCAL image URLs (starting with /images/)
  const books = await Book.find({
    'pages.imageUrl': { $regex: '^/images/' }
  });

  console.log(`📚 Found ${books.length} books with local images to migrate\n`);

  if (books.length === 0) {
    console.log('🎉 Nothing to migrate! All images are already in R2.');
    await mongoose.disconnect();
    return;
  }

  let totalPages = 0;
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let b = 0; b < books.length; b++) {
    const book = books[b];
    console.log(`\n📖 Book ${b + 1}/${books.length}: "${book.title}" (${book._id})`);

    let bookChanged = false;

    for (let p = 0; p < book.pages.length; p++) {
      const page = book.pages[p];
      totalPages++;

      // Only migrate local URLs
      if (!page.imageUrl || !page.imageUrl.startsWith('/images/')) {
        console.log(`   Page ${page.pageNumber}: already R2 or empty, skipping`);
        skippedCount++;
        continue;
      }

      // Build the local file path
      // URL is like: /images/BOOKID/page-1.png
      const relativePath = page.imageUrl.replace('/images/', '');
      const localFile = path.join(IMAGES_DIR, relativePath);

      if (!fs.existsSync(localFile)) {
        console.log(`   ❌ Page ${page.pageNumber}: file not found on disk: ${localFile}`);
        failCount++;
        continue;
      }

      // Build R2 key: direct/userId/bookId/page-1.png
      const fileName = path.basename(localFile);
      const r2Key = 'direct/' + book.userId + '/' + book._id + '/' + fileName;

      try {
        const newUrl = await uploadToR2(localFile, r2Key);
        book.pages[p].imageUrl = newUrl;
        bookChanged = true;
        successCount++;
        console.log(`   ✅ Page ${page.pageNumber}: uploaded → ${newUrl}`);
      } catch (err) {
        console.log(`   ❌ Page ${page.pageNumber}: upload failed — ${err.message}`);
        failCount++;
      }
    }

    // Save the book with new R2 URLs
    if (bookChanged) {
      await book.save();
      console.log(`   💾 Book saved with new R2 URLs`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!');
  console.log(`   📸 Total pages processed : ${totalPages}`);
  console.log(`   ☁️  Uploaded to R2        : ${successCount}`);
  console.log(`   ⏭️  Skipped (already R2)  : ${skippedCount}`);
  console.log(`   ❌ Failed                 : ${failCount}`);
  console.log('='.repeat(60) + '\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB. All done!\n');
}

migrate().catch(err => {
  console.error('💥 Migration crashed:', err);
  process.exit(1);
});
