const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const { generateStory } = require('../services/openaiService');
const { generateImage } = require('../services/imageService');

const router = express.Router();

// Make sure images folder exists
const imagesDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

router.post('/create', auth, async (req, res) => {
  try {
    const { topic, title } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user.booksCreated >= user.booksLimit) {
      return res.status(403).json({ error: 'Book limit reached. Please upgrade!' });
    }

    console.log('📖 Creating book:', title);

    // Step 1: Generate story
    console.log('📝 Generating story...');
    const storyResult = await generateStory(topic);
    if (!storyResult.success) {
      return res.status(500).json({ error: 'Failed to generate story' });
    }

    const bookId = Date.now().toString();
    const bookImgDir = path.join(imagesDir, bookId);
    fs.mkdirSync(bookImgDir, { recursive: true });

    // Step 2: Generate images
    console.log('🎨 Generating images...');
    const pages = [];
    for (let i = 0; i < storyResult.story.length; i++) {
      const page = storyResult.story[i];
      console.log('  🖼️ Page ' + (i + 1) + '/' + storyResult.story.length);

      const imgResult = await generateImage(page.imagePrompt);
      let imageUrl = '';

      if (imgResult.success) {
        if (imgResult.imageData) {
          // Gemini returns base64 - save to file
          const fileName = 'page-' + (i + 1) + '.png';
          const filePath = path.join(bookImgDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(imgResult.imageData, 'base64'));
          imageUrl = '/images/' + bookId + '/' + fileName;
        } else if (imgResult.imageUrl) {
          // Flux returns URL
          imageUrl = imgResult.imageUrl;
        }
      }

      pages.push({
        pageNumber: i + 1,
        text: page.text,
        imagePrompt: page.imagePrompt,
        imageUrl: imageUrl,
        imageProvider: imgResult.success ? imgResult.provider : 'none'
      });
    }

    const book = new Book({
      userId,
      title: title || topic,
      topic,
      pages,
      status: 'completed'
    });
    await book.save();

    user.booksCreated += 1;
    await user.save();

    console.log('✅ Book completed:', title);
    res.json({ message: 'Book created!', book });
  } catch (error) {
    console.log('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-books', auth, async (req, res) => {
  try {
    const books = await Book.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
