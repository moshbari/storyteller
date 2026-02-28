const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const { generateStory } = require('../services/openaiService');
const geminiService = require('../services/geminiService');
const fluxService = require('../services/fluxService');

const router = express.Router();

const imagesDir = path.join(__dirname, '../../public/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const flipbooksDir = path.join(__dirname, '../../public/flipbooks');
if (!fs.existsSync(flipbooksDir)) fs.mkdirSync(flipbooksDir, { recursive: true });

// ============================================
// CREATE A BOOK
// ============================================
router.post('/create', auth, async (req, res) => {
  try {
    const { topic, title, artStyle, mood, pageCount } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user.booksCreated >= user.booksLimit) {
      return res.status(403).json({ error: 'Book limit reached. Please upgrade!' });
    }

    const numPages = pageCount || 5;
    console.log('📖 Creating book:', title, '| Pages:', numPages, '| Art:', artStyle, '| Mood:', mood);

    // Step 1: Generate story with character description
    console.log('📝 Generating story...');
    const storyResult = await generateStory(topic, numPages);
    if (!storyResult.success) {
      return res.status(500).json({ error: 'Failed to generate story' });
    }

    console.log('🎭 Character:', storyResult.characterDescription);

    const bookId = Date.now().toString();
    const bookImgDir = path.join(imagesDir, bookId);
    fs.mkdirSync(bookImgDir, { recursive: true });

    // Step 2: Generate ALL images with character consistency via Gemini conversation
    console.log('🎨 Generating images with character consistency...');
    
    // Add art style to prompts
    const styledPages = storyResult.story.map(p => ({
      ...p,
      imagePrompt: p.imagePrompt + (artStyle ? '. Art style: ' + artStyle + '.' : '') + (mood ? ' Mood: ' + mood + '.' : '')
    }));
    
    const geminiResults = await geminiService.generateBookImages(
      styledPages,
      storyResult.characterDescription
    );

    // Step 3: Build pages, use Flux fallback for any failed Gemini images
    const pages = [];
    for (let i = 0; i < storyResult.story.length; i++) {
      const page = storyResult.story[i];
      let imageUrl = '';
      let provider = 'none';

      if (geminiResults[i] && geminiResults[i].success) {
        const fileName = 'page-' + (i + 1) + '.png';
        const filePath = path.join(bookImgDir, fileName);
        fs.writeFileSync(filePath, Buffer.from(geminiResults[i].imageData, 'base64'));
        imageUrl = '/images/' + bookId + '/' + fileName;
        provider = 'gemini';
      } else {
        console.log('  🔄 Flux fallback for page ' + (i + 1));
        const fluxResult = await fluxService.generateImage(page.imagePrompt);
        if (fluxResult.success) {
          imageUrl = fluxResult.imageUrl;
          provider = 'flux';
        }
      }

      pages.push({
        pageNumber: i + 1,
        text: page.text,
        imagePrompt: page.imagePrompt,
        imageUrl,
        imageProvider: provider
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

// ============================================
// GET ALL MY BOOKS
// ============================================
router.get('/my-books', auth, async (req, res) => {
  try {
    const books = await Book.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET ONE BOOK
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json({ book });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DOWNLOAD PDF (Print-ready)
// ============================================
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const PDFDocument = require('pdfkit');
    const axios = require('axios');

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 0, left: 50, right: 50 },
      info: {
        Title: book.title,
        Author: 'StoryTeller AI',
        Creator: 'StoryTeller'
      }
    });

    // Set response headers
    const safeName = book.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '.pdf"');
    doc.pipe(res);

    const pageW = 612; // Letter width in points
    const pageH = 792; // Letter height in points
    const margin = 50;
    const contentW = pageW - margin * 2;

    // Helper: load image buffer from local or remote URL
    async function loadImage(imageUrl) {
      try {
        if (imageUrl.startsWith('/images/')) {
          const localPath = path.join(__dirname, '../../public', imageUrl);
          if (fs.existsSync(localPath)) return fs.readFileSync(localPath);
        } else if (imageUrl.startsWith('http')) {
          const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          return Buffer.from(imgResponse.data);
        }
      } catch (e) { console.log('⚠️ Image load error:', e.message); }
      return null;
    }

    // --- COVER PAGE ---
    doc.rect(0, 0, pageW, pageH).fill('#1a1a2e');

    let coverLoaded = false;
    if (book.pages[0] && book.pages[0].imageUrl) {
      const coverBuf = await loadImage(book.pages[0].imageUrl);
      if (coverBuf) {
        doc.image(coverBuf, 0, 0, { fit: [pageW, pageH * 0.55], align: 'center', valign: 'top' });
        doc.rect(0, pageH * 0.50, pageW, pageH * 0.50).fill('#1a1a2e');
        coverLoaded = true;
      }
    }

    // Title - auto-size for long titles
    const titleY = coverLoaded ? pageH * 0.55 : pageH / 2 - 80;
    const titleLen = book.title.length;
    const titleSize = titleLen > 30 ? 28 : titleLen > 20 ? 32 : 38;
    doc.fontSize(titleSize).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(book.title, margin, titleY, { width: contentW, align: 'center' });

    // Subtitle - positioned after title
    const subtitleY = titleY + titleSize + (titleLen > 20 ? 50 : 30);
    doc.fontSize(14).fillColor('#aaaacc').font('Helvetica');
    doc.text('A StoryTeller Book', margin, subtitleY, { width: contentW, align: 'center' });

    // Footer
    doc.fontSize(11).fillColor('#666688');
    doc.text('Created with StoryTeller AI', margin, pageH - 80, { width: contentW, align: 'center' });

    // --- STORY PAGES ---
    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i];
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill('#ffffff');

      let textStartY = margin;

      if (page.imageUrl) {
        const imgBuffer = await loadImage(page.imageUrl);
        if (imgBuffer) {
          const imgH = 400;
          doc.image(imgBuffer, margin, margin, {
            fit: [contentW, imgH],
            align: 'center',
            valign: 'center'
          });
          textStartY = margin + imgH + 20;
        }
      }

      // Story text - contained to prevent blank pages
      doc.fontSize(14).fillColor('#333333').font('Helvetica');
      doc.text(page.text || '', margin, textStartY, {
        width: contentW,
        align: 'center',
        lineGap: 5
      });

      // Page number - fixed position, no line break to prevent new page
      doc.fontSize(10).fillColor('#bbbbbb').font('Helvetica');
      doc.text(String(i + 1), 0, pageH - 40, { width: pageW, align: 'center', lineBreak: false });
    }

    doc.end();
    console.log('📄 PDF generated for:', book.title);

  } catch (error) {
    console.log('❌ PDF error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF: ' + error.message });
    }
  }
});

// ============================================
// DOWNLOAD KDP (Amazon-ready PDF)
// ============================================
router.get('/:id/kdp', auth, async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const PDFDocument = require('pdfkit');
    const axios = require('axios');

    // KDP standard children's book: 8.5 x 8.5 inches (square)
    // With 0.125" bleed on each side = 8.75 x 8.75 inches
    // 1 inch = 72 points
    const trimW = 8.5 * 72;   // 612 points
    const trimH = 8.5 * 72;   // 612 points
    const bleed = 0.125 * 72;  // 9 points
    const totalW = trimW + bleed * 2; // 630 points
    const totalH = trimH + bleed * 2; // 630 points
    const safeMargin = 0.375 * 72; // 27 points - safe zone from trim

    const doc = new PDFDocument({
      size: [totalW, totalH],
      margins: { top: bleed + safeMargin, bottom: bleed + safeMargin, left: bleed + safeMargin, right: bleed + safeMargin },
      info: {
        Title: book.title,
        Author: 'StoryTeller AI',
        Creator: 'StoryTeller - KDP Ready'
      }
    });

    const safeName = book.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '-KDP.pdf"');
    doc.pipe(res);

    const contentX = bleed + safeMargin;
    const contentY = bleed + safeMargin;
    const contentW = trimW - safeMargin * 2;
    const contentH = trimH - safeMargin * 2;

    // Helper: load image buffer
    async function loadImageKDP(imageUrl) {
      try {
        if (imageUrl.startsWith('/images/')) {
          const localPath = path.join(__dirname, '../../public', imageUrl);
          if (fs.existsSync(localPath)) return fs.readFileSync(localPath);
        } else if (imageUrl.startsWith('http')) {
          const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
          return Buffer.from(imgResponse.data);
        }
      } catch (e) { console.log('⚠️ KDP image load error:', e.message); }
      return null;
    }

    // --- COVER PAGE ---
    doc.rect(0, 0, totalW, totalH).fill('#1a1a2e');

    // Try to use first image as cover art
    if (book.pages[0] && book.pages[0].imageUrl) {
      const coverBuf = await loadImageKDP(book.pages[0].imageUrl);
      if (coverBuf) {
        doc.image(coverBuf, 0, 0, { width: totalW, height: totalH * 0.6 });
        doc.rect(0, totalH * 0.45, totalW, totalH * 0.55).fill('#1a1a2e');
      }
    }

    doc.fontSize(42).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(book.title, contentX, totalH * 0.52, { width: contentW, align: 'center' });

    doc.fontSize(16).fillColor('#aaaacc').font('Helvetica');
    doc.text('A StoryTeller Book', contentX, totalH * 0.52 + 60, { width: contentW, align: 'center' });

    // --- STORY PAGES ---
    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i];
      doc.addPage();

      // White background with bleed
      doc.rect(0, 0, totalW, totalH).fill('#ffffff');

      let imgLoaded = false;

      // FIRST: Image
      if (page.imageUrl) {
        const imgBuffer = await loadImageKDP(page.imageUrl);
        if (imgBuffer) {
          const imgH = contentH * 0.65;
          doc.image(imgBuffer, bleed, bleed, {
            width: trimW,
            height: imgH,
            fit: [trimW, imgH],
            align: 'center',
            valign: 'center'
          });
          imgLoaded = true;

          // SECOND: Text below image
          doc.fontSize(16).fillColor('#333333').font('Helvetica');
          doc.text(page.text || '', contentX, bleed + imgH + 25, {
            width: contentW,
            align: 'center',
            lineGap: 8
          });
        }
      }

      if (!imgLoaded) {
        doc.fontSize(20).fillColor('#333333').font('Helvetica');
        doc.text(page.text || '', contentX, totalH / 3, {
          width: contentW,
          align: 'center',
          lineGap: 10
        });
      }

      // LAST: Page number at bottom
      doc.fontSize(10).fillColor('#999999').font('Helvetica');
      doc.text((i + 1).toString(), 0, totalH - bleed - safeMargin + 5, { width: totalW, align: 'center' });
    }

    // --- BACK COVER ---
    doc.addPage();
    doc.rect(0, 0, totalW, totalH).fill('#1a1a2e');
    doc.fontSize(14).fillColor('#aaaacc').font('Helvetica');
    doc.text('Made with StoryTeller AI ✨', contentX, totalH / 2, {
      width: contentW,
      align: 'center'
    });

    doc.end();
    console.log('📕 KDP PDF generated for:', book.title);

  } catch (error) {
    console.log('❌ KDP error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate KDP: ' + error.message });
    }
  }
});

// ============================================
// GENERATE FLIPBOOK (Shareable link)
// ============================================
router.get('/:id/flipbook', auth, async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, userId: req.user.id });
    if (!book) return res.status(404).json({ error: 'Book not found' });

    const bookDir = path.join(flipbooksDir, book._id.toString());
    if (!fs.existsSync(bookDir)) fs.mkdirSync(bookDir, { recursive: true });

    // Build pages JSON for the flipbook
    const pagesData = book.pages.map((p, i) => ({
      num: i + 1,
      text: (p.text || '').replace(/'/g, "\\'").replace(/\n/g, ' '),
      imageUrl: p.imageUrl || ''
    }));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${book.title} - StoryTeller</title>
<meta property="og:title" content="${book.title}">
<meta property="og:description" content="A magical story created with StoryTeller AI">
<meta property="og:image" content="${book.pages[0]?.imageUrl || ''}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.header{text-align:center;margin-bottom:24px;color:white}
.header h1{font-size:28px;margin-bottom:4px;text-shadow:0 2px 8px rgba(0,0,0,0.3)}
.header p{opacity:0.8;font-size:14px}
.flipbook{background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:600px;width:100%;overflow:hidden;position:relative}
.page-display{position:relative}
.page-display img{width:100%;display:block;min-height:300px;object-fit:cover;background:#f0f0f0}
.page-text{padding:24px 28px;font-size:17px;line-height:1.7;color:#333;text-align:center;min-height:80px}
.controls{display:flex;align-items:center;justify-content:center;gap:16px;padding:16px 20px;border-top:1px solid #eee;background:#fafafa;border-radius:0 0 16px 16px}
.controls button{padding:10px 24px;border:none;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;transition:0.3s}
.btn-prev{background:#f1f5f9;color:#333}
.btn-next{background:linear-gradient(135deg,#FF6B6B,#ee5a24);color:white}
.btn-prev:hover,.btn-next:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
.btn-prev:disabled,.btn-next:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none}
.page-num{font-weight:700;color:#999;font-size:14px;min-width:80px;text-align:center}
.footer{margin-top:20px;text-align:center;color:rgba(255,255,255,0.7);font-size:13px}
.footer a{color:white;text-decoration:none;font-weight:700}
.no-img{width:100%;height:300px;display:flex;align-items:center;justify-content:center;background:#f0f4ff;font-size:60px}
@media(max-width:640px){.header h1{font-size:22px}.page-text{font-size:15px;padding:18px}.controls button{padding:8px 18px;font-size:13px}}
</style>
</head>
<body>
<div class="header">
  <h1>📖 ${book.title}</h1>
  <p>A StoryTeller Book</p>
</div>
<div class="flipbook">
  <div class="page-display">
    <img id="pageImg" src="" alt="Page illustration">
    <div class="no-img" id="noImg" style="display:none">📖</div>
  </div>
  <div class="page-text" id="pageText"></div>
  <div class="controls">
    <button class="btn-prev" id="btnP" onclick="go(-1)">← Back</button>
    <span class="page-num" id="pageNum">1 / ${book.pages.length}</span>
    <button class="btn-next" id="btnN" onclick="go(1)">Next →</button>
  </div>
</div>
<div class="footer">Made with <a href="/">StoryTeller</a> ✨</div>
<script>
const pages=${JSON.stringify(pagesData)};
let cur=0;
function show(){
  const p=pages[cur];
  const img=document.getElementById('pageImg');
  const noImg=document.getElementById('noImg');
  if(p.imageUrl){img.src=p.imageUrl;img.style.display='block';noImg.style.display='none';}
  else{img.style.display='none';noImg.style.display='flex';}
  document.getElementById('pageText').textContent=p.text;
  document.getElementById('pageNum').textContent=(cur+1)+' / '+pages.length;
  document.getElementById('btnP').disabled=cur===0;
  document.getElementById('btnN').disabled=cur===pages.length-1;
}
function go(d){cur=Math.max(0,Math.min(pages.length-1,cur+d));show();}
show();
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight')go(1);if(e.key==='ArrowLeft')go(-1);});
let tx=0;document.querySelector('.flipbook').addEventListener('touchstart',function(e){tx=e.touches[0].clientX;});
document.querySelector('.flipbook').addEventListener('touchend',function(e){const diff=e.changedTouches[0].clientX-tx;if(Math.abs(diff)>50){diff<0?go(1):go(-1);}});
</script>
</body>
</html>`;

    // Save the flipbook HTML
    const filePath = path.join(bookDir, 'index.html');
    fs.writeFileSync(filePath, html);

    const flipbookUrl = '/flipbooks/' + book._id.toString() + '/index.html';
    console.log('📱 Flipbook generated for:', book.title, '→', flipbookUrl);

    res.json({
      message: 'Flipbook created!',
      url: flipbookUrl,
      fullUrl: req.protocol + '://' + req.get('host') + flipbookUrl
    });

  } catch (error) {
    console.log('❌ Flipbook error:', error.message);
    res.status(500).json({ error: 'Failed to generate flipbook: ' + error.message });
  }
});

module.exports = router;
