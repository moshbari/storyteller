const gemini = require('./geminiService');
const flux = require('./fluxService');

async function generateImage(prompt) {
  // Try Gemini first (FREE!)
  console.log('🎨 Trying Gemini...');
  const geminiResult = await gemini.generateImage(prompt);

  if (geminiResult.success) {
    console.log('✅ Gemini success!');
    return { ...geminiResult, provider: 'gemini' };
  }

  // If Gemini fails, use Flux (costs $0.003)
  console.log('🔄 Switching to Flux...');
  const fluxResult = await flux.generateImage(prompt);

  if (fluxResult.success) {
    console.log('✅ Flux success!');
    return { ...fluxResult, provider: 'flux' };
  }

  return { success: false, error: 'Both providers failed' };
}

module.exports = { generateImage };
