const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function generateImage(prompt) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Generate a children's book illustration: ${prompt}. Style: colorful, cartoon, friendly, suitable for kids.`
          }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      }
    );

    const parts = response.data.candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData) {
        return {
          success: true,
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType
        };
      }
    }

    return { success: false, error: 'No image generated' };
  } catch (error) {
    console.log('⚠️ Gemini failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateImage };
