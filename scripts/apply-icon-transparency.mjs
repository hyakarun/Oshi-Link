/**
 * icon.png の四隅の白背景を透過（角丸マスク）
 * 実行: node scripts/apply-icon-transparency.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'src/app/icon.png');

/** iOS アプリアイコン相当の角丸率 */
const CORNER_RATIO = 0.223;

function roundedMaskSvg(size) {
  const r = Math.round(size * CORNER_RATIO);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/>` +
      `</svg>`
  );
}

async function toTransparentPng(input, size) {
  const mask = roundedMaskSvg(size);
  return sharp(input)
    .resize(size, size, { fit: 'cover' })
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  const meta = await sharp(source).metadata();
  const fullSize = meta.width || 1024;

  const iconPng = await toTransparentPng(source, fullSize);
  const targets = [
    path.join(root, 'src/app/icon.png'),
    path.join(root, 'public/icon.png'),
    path.join(root, 'src/app/apple-icon.png'),
    path.join(root, 'public/apple-icon.png'),
  ];
  for (const t of targets) {
    await fs.promises.writeFile(t, iconPng);
    console.log('wrote', t);
  }

  const fav32 = await toTransparentPng(source, 32);
  const ico = await toIco([fav32]);
  const icoTargets = [
    path.join(root, 'src/app/favicon.ico'),
    path.join(root, 'public/favicon.ico'),
  ];
  for (const t of icoTargets) {
    await fs.promises.writeFile(t, ico);
    console.log('wrote', t, ico.length, 'bytes');
  }

  const { data } = await sharp(iconPng).raw().toBuffer({ resolveWithObject: true });
  const w = fullSize;
  const i = 0;
  console.log('corner alpha after:', data[i + 3] ?? 'no alpha channel');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
