const axios = require('axios');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

// Generate a single image (kept for backward compatibility / fallback)
async function generateImage(prompt) {
  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
      {
        input: {
          prompt: `Children's book illustration: ${prompt}. Style: colorful, cartoon, friendly, suitable for kids.`,
          num_outputs: 1,
          output_format: 'png'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait'
        }
      }
    );

    if (response.data.output && response.data.output.length > 0) {
      return {
        success: true,
        imageUrl: response.data.output[0]
      };
    }

    return { success: false, error: 'No image generated' };
  } catch (error) {
    console.log('⚠️ Flux failed:', error.response?.data?.detail || error.message);
    return { success: false, error: error.message };
  }
}

// Generate ALL book images with character consistency
// Uses same seed + detailed character description in every prompt
async function generateBookImages(pages, characterDescription) {
  const results = [];

  // Use a random seed but keep it SAME for all pages in this book
  const bookSeed = Math.floor(Math.random() * 2147483647);

  console.log('🎨 Flux generating', pages.length, 'images with seed:', bookSeed);

  for (let i = 0; i < pages.length; i++) {
    try {
      // Build a rich prompt with character description baked in
      const prompt = [
        'Children\'s book illustration.',
        'Main character: ' + characterDescription,
        'Scene: ' + pages[i].imagePrompt,
        'Style: consistent character design, colorful, cartoon, digital illustration, friendly, warm lighting, storybook art, same character in every scene.',
        'Important: Draw the main character exactly as described above - same colors, same proportions, same outfit, same features.'
      ].join(' ');

      const response = await axios.post(
        'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
        {
          input: {
            prompt,
            seed: bookSeed,
            num_outputs: 1,
            output_format: 'png'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'wait'
          }
        }
      );

      if (response.data.output && response.data.output.length > 0) {
        console.log('  ✅ Flux page ' + (i + 1) + ' done');
        results.push({
          success: true,
          imageUrl: response.data.output[0],
          provider: 'flux'
        });
      } else {
        console.log('  ⚠️ Flux page ' + (i + 1) + ' no image');
        results.push({ success: false, error: 'No image generated' });
      }
    } catch (error) {
      console.log('  ⚠️ Flux page ' + (i + 1) + ' failed:', error.response?.data?.detail || error.message);
      results.push({ success: false, error: error.message });
    }
  }

  return results;
}

module.exports = { generateImage, generateBookImages };
