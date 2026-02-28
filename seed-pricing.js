require('dotenv').config();
const mongoose = require('mongoose');
const Tier = require('./models/Tier');
const CreditPack = require('./models/CreditPack');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Only seed if no tiers exist
  const existingTiers = await Tier.countDocuments();
  if (existingTiers > 0) {
    console.log('Tiers already exist, skipping seed.');
    process.exit();
  }

  // Default Tiers
  await Tier.create([
    {
      name: 'Free',
      price: 0,
      credits: 3,
      features: ['3 books included', 'Basic art styles', 'PDF download', '5 pages per book'],
      artStyles: ['Cartoon', 'Watercolor'],
      maxPages: 5,
      downloads: { pdf: true, images: false, kdp: false, flipbook: false },
      isDefault: true,
      active: true,
      order: 0,
      badge: ''
    },
    {
      name: 'Starter',
      price: 9,
      credits: 15,
      features: ['15 books included', 'All art styles', 'PDF + Image downloads', '9 pages per book', 'No watermark'],
      artStyles: ['Cartoon', 'Watercolor', 'Storybook', 'Anime', 'Pixar 3D'],
      maxPages: 9,
      downloads: { pdf: true, images: true, kdp: false, flipbook: false },
      isDefault: false,
      active: true,
      order: 1,
      highlight: true,
      badge: 'Popular'
    },
    {
      name: 'Creator',
      price: 29,
      credits: 50,
      features: ['50 books included', 'All art styles & moods', 'All downloads (PDF, KDP, Flipbook)', '12 pages per book', 'No watermark', 'Priority generation'],
      artStyles: ['Cartoon', 'Watercolor', 'Storybook', 'Anime', 'Pixar 3D'],
      maxPages: 12,
      downloads: { pdf: true, images: true, kdp: true, flipbook: true },
      isDefault: false,
      active: true,
      order: 2,
      badge: 'Best Value'
    }
  ]);
  console.log('✅ 3 default tiers created');

  // Default Credit Packs
  await CreditPack.create([
    { name: '5 Book Pack', credits: 5, price: 5, savings: '', active: true, order: 0 },
    { name: '15 Book Pack', credits: 15, price: 12, savings: 'Save 20%', active: true, order: 1, highlight: true },
    { name: '50 Book Pack', credits: 50, price: 35, savings: 'Save 30%', active: true, order: 2 }
  ]);
  console.log('✅ 3 default credit packs created');

  process.exit();
}

seed().catch(e => { console.error(e); process.exit(1); });
