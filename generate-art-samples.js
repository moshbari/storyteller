// generate-art-samples.js
// Run ONCE to generate sample thumbnails for each art style
// Cost: ~$0.40-0.60 total (15 small images via gpt-image-1-mini)

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Same prompt for all — so users can clearly see the STYLE difference
const BASE_PROMPT = 'A cute bunny sitting in a colorful garden with flowers and butterflies, children\'s book illustration';

const ART_STYLES = [
  { id: 'cartoon',        label: 'Cartoon',        stylePrompt: 'Bold cartoon style with thick outlines, bright flat colors, playful and fun, like a modern animated show' },
  { id: 'watercolor',     label: 'Watercolor',     stylePrompt: 'Soft watercolor painting style with gentle color washes, visible brush strokes, dreamy and delicate' },
  { id: 'storybook',      label: 'Storybook',      stylePrompt: 'Classic storybook illustration style, warm golden tones, detailed and cozy, like a traditional fairy tale book' },
  { id: 'anime',          label: 'Anime',          stylePrompt: 'Japanese anime style with big expressive eyes, vibrant colors, clean lines, manga-inspired illustration' },
  { id: 'pixar3d',        label: 'Pixar 3D',       stylePrompt: '3D rendered Pixar-style animation, smooth surfaces, cinematic lighting, high quality CGI look' },
  { id: 'crayon',         label: 'Crayon',         stylePrompt: 'Crayon drawing style like a child drew it, waxy texture, rough coloring, colorful and innocent' },
  { id: 'pencil-sketch',  label: 'Pencil Sketch',  stylePrompt: 'Pencil sketch drawing style, graphite on paper, detailed shading and hatching, black and white with subtle tones' },
  { id: 'pop-art',        label: 'Pop Art',        stylePrompt: 'Pop art style like Andy Warhol, bold primary colors, halftone dots, high contrast, graphic and eye-catching' },
  { id: 'paper-cut',      label: 'Paper Cut',      stylePrompt: 'Paper cut-out collage style, layered paper textures, visible paper edges, craft-style illustration' },
  { id: 'oil-painting',   label: 'Oil Painting',   stylePrompt: 'Oil painting style with rich thick brushstrokes, deep saturated colors, textured canvas feel, classical art' },
  { id: 'comic-book',     label: 'Comic Book',     stylePrompt: 'Comic book style with bold ink outlines, action lines, speech bubbles, bright superhero-comic colors' },
  { id: 'pastel',         label: 'Pastel',         stylePrompt: 'Soft pastel chalk art style, gentle muted colors, powdery texture, dreamy and ethereal' },
  { id: 'vintage-retro',  label: 'Vintage Retro',  stylePrompt: 'Vintage retro illustration style from the 1950s, muted warm tones, slightly faded, nostalgic mid-century look' },
  { id: 'chibi',          label: 'Chibi',          stylePrompt: 'Chibi kawaii style, super cute with oversized head, tiny body, big sparkly eyes, adorable Japanese kawaii' },
  { id: 'chalk-art',      label: 'Chalk Art',      stylePrompt: 'Chalk art on a dark chalkboard background, colorful chalky texture, handmade feel, bright chalk colors on dark surface' },
];

const outputDir = path.join(__dirname, 'public', 'art-samples');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function generateSample(style) {
  const prompt = BASE_PROMPT + '. Art style: ' + style.stylePrompt;
  
  try {
    console.log('🎨 Generating: ' + style.label + '...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'gpt-image-1-mini',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'low'
      },
      {
        headers: {
          'Authorization': 'Bearer ' + OPENAI_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    if (response.data.data && response.data.data[0] && response.data.data[0].b64_json) {
      const imageData = response.data.data[0].b64_json;
      const filePath = path.join(outputDir, style.id + '.png');
      fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));
      console.log('  ✅ Saved: ' + filePath);
      return true;
    } else {
      console.log('  ⚠️ No image data for ' + style.label);
      return false;
    }
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.log('  ❌ Failed: ' + style.label + ' — ' + errMsg);
    return false;
  }
}

async function main() {
  console.log('');
  console.log('🖼️  Art Style Sample Generator');
  console.log('================================');
  console.log('Generating 15 sample images...');
  console.log('Same scene (bunny in garden) in each art style');
  console.log('Saving to: ' + outputDir);
  console.log('');

  let success = 0;
  let failed = 0;

  for (const style of ART_STYLES) {
    // Check if already exists (skip re-generating)
    const filePath = path.join(outputDir, style.id + '.png');
    if (fs.existsSync(filePath)) {
      console.log('⏭️  Skipping ' + style.label + ' (already exists)');
      success++;
      continue;
    }

    const ok = await generateSample(style);
    if (ok) success++;
    else failed++;
    
    // Small delay between requests to be nice to the API
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('');
  console.log('================================');
  console.log('✅ Done! ' + success + ' generated, ' + failed + ' failed');
  console.log('');
  
  if (failed > 0) {
    console.log('💡 Run this script again to retry failed ones (it skips existing images)');
  }
}

main();
