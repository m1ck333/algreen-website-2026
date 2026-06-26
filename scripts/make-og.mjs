// Generates a branded 1200x630 Open Graph image from the hero photo.
// Run: node scripts/make-og.mjs
import sharp from 'sharp';

const SRC = new URL('../public/img/hero-door-new.jpg', import.meta.url).pathname;
const OUT = new URL('../public/img/og-default.jpg', import.meta.url).pathname;

const W = 1200;
const H = 630;

const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#161313" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#161313" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#161313" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect x="80" y="430" width="56" height="3" fill="#c2a24c"/>
  <text x="80" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" fill="#ffffff">ALGREEN</text>
  <text x="80" y="548" font-family="Arial, sans-serif" font-size="26" fill="#e3cf94" letter-spacing="2">Ekskluzivna aluminijumska ulazna vrata</text>
  <text x="80" y="586" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" opacity="0.7">Niš · Beograd · algreen.rs</text>
</svg>`);

await sharp(SRC)
  .resize(W, H, { fit: 'cover', position: 'centre' })
  .composite([{ input: overlay, top: 0, left: 0 }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(OUT);

console.log('Wrote', OUT);
