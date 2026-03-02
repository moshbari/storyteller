const flux = require('./fluxService');

async function generateImage(prompt) {
  // Use Flux Schnell (costs $0.003 per image)
  console.log('🎨 Generating image with Flux...');
  const fluxResult = await flux.generateImage(prompt);

  if (fluxResult.success) {
    console.log('✅ Flux success!');
    return { ...fluxResult, provider: 'flux' };
  }

  return { success: false, error: 'Image generation failed' };
}

module.exports = { generateImage };
