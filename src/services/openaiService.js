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
          content: `You are a children's book author. Create a ${pages}-page story. Return ONLY a JSON array with objects containing "page" (number), "text" (the story text for that page, 2-3 sentences), and "imagePrompt" (a detailed description for an illustrator). Make it fun, educational, and age-appropriate.`
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
    const story = JSON.parse(content.replace(/```json|```/g, '').trim());

    return { success: true, story };
  } catch (error) {
    console.log('⚠️ OpenAI failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { generateStory };
