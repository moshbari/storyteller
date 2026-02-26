const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

async function generateBookImages(pages, characterDescription) {
  const results = [];
  const conversationHistory = [];

  for (let i = 0; i < pages.length; i++) {
    try {
      let prompt;

      if (i === 0) {
        // First image: establish the character look
        prompt = `Create a children's book illustration. Character description: ${characterDescription}. Scene: ${pages[i].imagePrompt}. Style: colorful, cartoon, friendly, consistent character design. Remember this exact character design for future images.`;
      } else {
        // Following images: reference previous character
        prompt = `Create the next illustration for the same children's book. Use the EXACT SAME character design as the previous illustrations - same colors, same proportions, same style. Scene: ${pages[i].imagePrompt}`;
      }

      // Build conversation with history
      const contents = [...conversationHistory, {
        role: 'user',
        parts: [{ text: prompt }]
      }];

      const response = await axios.post(
        `${BASE_URL}?key=${GEMINI_API_KEY}`,
        {
          contents,
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        }
      );

      const responseParts = response.data.candidates[0].content.parts;
      let imageData = null;
      let mimeType = null;
      let responseText = '';

      for (const part of responseParts) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType;
        }
        if (part.text) {
          responseText = part.text;
        }
      }

      // Add to conversation history for consistency
      conversationHistory.push({ role: 'user', parts: [{ text: prompt }] });
      conversationHistory.push({ role: 'model', parts: responseParts });

      if (imageData) {
        console.log('  ✅ Gemini page ' + (i + 1) + ' done');
        results.push({ success: true, imageData, mimeType, provider: 'gemini' });
      } else {
        console.log('  ⚠️ Gemini page ' + (i + 1) + ' no image');
        results.push({ success: false, error: 'No image generated' });
      }
    } catch (error) {
      console.log('  ⚠️ Gemini page ' + (i + 1) + ' failed:', error.response?.data?.error?.message || error.message);
      results.push({ success: false, error: error.message });
    }
  }

  return results;
}

// Keep single image function for fallback
async function generateImage(prompt) {
  try {
    const response = await axios.post(
      `${BASE_URL}?key=${GEMINI_API_KEY}`,
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
        return { success: true, imageData: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    return { success: false, error: 'No image generated' };
  } catch (error) {
    console.log('⚠️ Gemini failed:', error.response?.data?.error?.message || error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateImage, generateBookImages };
