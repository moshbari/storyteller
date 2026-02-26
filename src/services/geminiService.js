const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

async function generateImage(prompt) {
  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{
        parts: [{
          text: `Generate a children's book illustration: ${prompt}. Style: colorful, cartoon, friendly, suitable for kids.`
        }]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    });

    // Extract image from response
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
    console.log('⚠️ Gemini failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateImage };
