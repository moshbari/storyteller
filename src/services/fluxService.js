const axios = require('axios');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

async function generateImage(prompt) {
  try {
    // Start the image generation
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'black-forest-labs/flux-schnell',
        input: {
          prompt: `Children's book illustration: ${prompt}. Style: colorful, cartoon, friendly, suitable for kids.`,
          num_outputs: 1,
          output_format: 'png'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Wait for result
    let prediction = response.data;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const check = await axios.get(prediction.urls.get, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
      });
      prediction = check.data;
    }

    if (prediction.status === 'succeeded') {
      return {
        success: true,
        imageUrl: prediction.output[0]
      };
    }

    return { success: false, error: 'Flux generation failed' };
  } catch (error) {
    console.log('⚠️ Flux failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateImage };
