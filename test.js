require('dotenv').config();
const { generateStory } = require('./src/services/openaiService');
const { generateImage } = require('./src/services/imageService');

async function test() {
  console.log('📝 Testing story generation...');
  const story = await generateStory('a brave little cat who learns to swim');
  
  if (story.success) {
    console.log('✅ Story created! Pages:', story.story.length);
    console.log('Page 1:', story.story[0].text);
    
    console.log('\n🎨 Testing image generation...');
    const image = await generateImage(story.story[0].imagePrompt);
    
    if (image.success) {
      console.log('✅ Image created! Provider:', image.provider);
    } else {
      console.log('❌ Image failed:', image.error);
    }
  } else {
    console.log('❌ Story failed:', story.error);
  }
}

test();
