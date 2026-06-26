// One-off image optimizer: downsize + recompress large images in public/img.
// Keeps the same filename/format so existing references keep working.
// Run: node scripts/optimize-images.mjs
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const DIR = new URL('../public/img/', import.meta.url).pathname;
const MAX_W = 1600; // plenty for full-bleed sections on retina
const MIN_BYTES = 180 * 1024; // only touch files above this size

const fmt = (b) => (b / 1024).toFixed(0) + 'KB';
let savedTotal = 0;
let touched = 0;

const files = await readdir(DIR);
for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) continue;

  const path = join(DIR, file);
  const before = (await stat(path)).size;
  if (before < MIN_BYTES) continue;

  try {
    const img = sharp(path, { failOn: 'none' });
    const meta = await img.metadata();
    let pipeline = img.rotate();
    if (meta.width && meta.width > MAX_W) {
      pipeline = pipeline.resize({ width: MAX_W, withoutEnlargement: true });
    }
    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, quality: 82, palette: true });
    else if (ext === '.webp') pipeline = pipeline.webp({ quality: 80 });
    else pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });

    const tmp = path + '.tmp';
    await pipeline.toFile(tmp);
    const after = (await stat(tmp)).size;

    if (after < before) {
      await rename(tmp, path);
      savedTotal += before - after;
      touched++;
      console.log(`✓ ${file}  ${fmt(before)} → ${fmt(after)}`);
    } else {
      await unlink(tmp);
    }
  } catch (e) {
    console.warn(`! skip ${file}: ${e.message}`);
  }
}

console.log(`\nOptimized ${touched} image(s); saved ${fmt(savedTotal)} total.`);
