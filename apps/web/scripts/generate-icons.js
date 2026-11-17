import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'public/branding/kalikkanundo-logo.svg');
const OUT_DIR = path.join(ROOT, 'public/icons');
const svgBuffer = fs.readFileSync(SVG_PATH);

async function generate() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // 1. icon-192.png (192x192) - Standard PWA icon
  // Content scaled to fit within 172x172 (around 90% with 10px safe margin)
  const svg192 = await sharp(svgBuffer)
    .resize(164, 164, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 11, g: 31, b: 25, alpha: 1 }, // #0B1F19
    },
  })
    .composite([{ input: svg192, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'icon-192.png'));
  console.log('Generated icon-192.png');

  // 2. icon-512.png (512x512) - Standard PWA icon
  const svg512 = await sharp(svgBuffer)
    .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 31, b: 25, alpha: 1 }, // #0B1F19
    },
  })
    .composite([{ input: svg512, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'icon-512.png'));
  console.log('Generated icon-512.png');

  // 3. icon-maskable-512.png (512x512) - Maskable icon: requires safe area inner 80% circle
  // 512 * 0.70 = ~358px to ensure 100% within safe zone on all Android masks
  const svgMaskable = await sharp(svgBuffer)
    .resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 31, b: 25, alpha: 1 }, // #0B1F19
    },
  })
    .composite([{ input: svgMaskable, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'icon-maskable-512.png'));
  console.log('Generated icon-maskable-512.png');

  // 4. apple-touch-icon.png (180x180) - Apple touch icon
  const svg180 = await sharp(svgBuffer)
    .resize(154, 154, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 11, g: 31, b: 25, alpha: 1 }, // #0B1F19
    },
  })
    .composite([{ input: svg180, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));
  
  // Also save apple-touch-icon.png directly in public root for iOS fallback
  fs.copyFileSync(
    path.join(OUT_DIR, 'apple-touch-icon.png'),
    path.join(ROOT, 'public/apple-touch-icon.png')
  );
  console.log('Generated apple-touch-icon.png');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
