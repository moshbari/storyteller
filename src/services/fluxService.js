const axios = require('axios');

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

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

module.exports = { generateImage };
