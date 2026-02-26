require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');
  try {
    const user = new User({ name: 'Mosh', email: 'mosh@test.com', password: 'test123' });
    await user.save();
    console.log('✅ User created:', user.email);
  } catch(err) {
    console.log('❌ Error:', err.message);
  }
  process.exit();
}
test();
