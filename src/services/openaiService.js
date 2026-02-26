const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateStory(topic, pages = 9) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `You are a children's book author and illustrator director. Create a ${pages}-page story. Return ONLY valid JSON (no markdown) with this structure:
{
  "characterDescription": "A very detailed visual description of the main character(s) - include exact colors, size, features, clothing, and any distinctive traits. Be very specific so an artist can draw the same character consistently across all pages.",
  "pages": [
    {
      "page": 1,
      "text": "The story text for this page (2-3 sentences)",
      "imagePrompt": "A detailed scene description for an illustrator. Always reference the main character by name and describe what they look like in this scene."
    }
  ]
}
Make the story fun, educational, and age-appropriate. The imagePrompt should describe the scene AND the character in detail each time.`
        }, {
          role: 'user',
          content: `Write a children's book about: ${topic}`
        }],
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

    return {
      success: true,
      story: parsed.pages,
      characterDescription: parsed.characterDescription
    };
  } catch (error) {
    console.log('⚠️ OpenAI failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateStory };
