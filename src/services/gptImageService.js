const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Generate ALL book images with character consistency
// GPT Image 1 Mini returns base64-encoded images
async function generateBookImages(pages, characterDescription) {
  const results = [];

  console.log('🎨 GPT Image Mini generating', pages.length, 'images...');

  for (let i = 0; i < pages.length; i++) {
    try {
      // Build a detailed prompt with character description
      const prompt = [
        'Children\'s book illustration for a storybook.',
        'Main character: ' + characterDescription,
        'Scene: ' + pages[i].imagePrompt,
        'Style: colorful cartoon, digital illustration, friendly, warm lighting, storybook art.',
        'Important: Draw ONLY ONE version of each character. Do NOT duplicate any characters. Keep the main character exactly as described — same colors, same proportions, same outfit, same features in every scene.'
      ].join(' ');

      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: 'gpt-image-1-mini',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'medium'
        },
        {
          headers: {
            'Authorization': 'Bearer ' + OPENAI_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 min timeout per image
        }
      );

      if (response.data.data && response.data.data[0]) {
        const imageData = response.data.data[0].b64_json;
        if (imageData) {
          console.log('  ✅ GPT Image page ' + (i + 1) + ' done');
          results.push({
            success: true,
            imageData,
            provider: 'gpt-image-mini'
          });
        } else {
          console.log('  ⚠️ GPT Image page ' + (i + 1) + ' no image data');
          results.push({ success: false, error: 'No image data returned' });
        }
      } else {
        console.log('  ⚠️ GPT Image page ' + (i + 1) + ' empty response');
        results.push({ success: false, error: 'Empty response' });
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message;
      console.log('  ⚠️ GPT Image page ' + (i + 1) + ' failed:', errMsg);
      results.push({ success: false, error: errMsg });
    }
  }

  return results;
}

// Generate a single image (for fallback use)
async function generateImage(prompt) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'gpt-image-1-mini',
        prompt: 'Children\'s book illustration: ' + prompt + '. Style: colorful, cartoon, friendly, suitable for kids.',
        n: 1,
        size: '1024x1024',
        quality: 'medium'
      },
      {
        headers: {
          'Authorization': 'Bearer ' + OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    if (response.data.data && response.data.data[0] && response.data.data[0].b64_json) {
      return {
        success: true,
        imageData: response.data.data[0].b64_json,
        provider: 'gpt-image-mini'
      };
    }
    return { success: false, error: 'No image generated' };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.log('⚠️ GPT Image Mini failed:', errMsg);
    return { success: false, error: errMsg };
  }
}

module.exports = { generateImage, generateBookImages };
