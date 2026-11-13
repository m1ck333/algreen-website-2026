// Generates the 1200x630 Open Graph image (link previews on WhatsApp, Facebook,
// LinkedIn…) in the 2026 design: the homepage hero mosaic, dark overlay, white
// logo, Inter caps line and a red accent — rendered by headless Chrome (one-off
// screenshot, no server).
// Run: node scripts/make-og.mjs   (needs Google Chrome + network for the Inter font)
//
// Writes public/img/og-2026.jpg (used by BaseLayout) and also overwrites the old
// og-default.jpg so link previews cached with the old URL get the new design.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const IMG = path.join(ROOT, 'public/img');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));

const tiles = ['design/hero-house.webp', 'design/hero-door.webp', 'design/hero-pivot.webp', 'design/access-control.webp'];
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=block" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;background:#141212;font-family:Inter,sans-serif}
.m{position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr)}
.m img{width:100%;height:100%;object-fit:cover;display:block}
.o{position:absolute;inset:0;background:rgba(20,18,18,.58)}
.g{position:absolute;inset:0;background:linear-gradient(to top,#141212 0%,rgba(20,18,18,0) 55%,rgba(20,18,18,.35) 100%)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.logo{width:430px}
.line{width:56px;height:2px;background:#e01f26;margin:34px 0 26px}
.t{color:rgba(255,255,255,.9);font-weight:600;font-size:21px;letter-spacing:.3em;text-transform:uppercase}
.s{position:absolute;bottom:34px;left:0;right:0;text-align:center;color:rgba(255,255,255,.6);font-weight:500;font-size:17px;letter-spacing:.18em;text-transform:uppercase}
.s b{color:#e01f26;font-weight:600}
</style></head><body>
<div class="m">${tiles.map((t) => `<img src="file://${IMG}/${t}">`).join('')}</div>
<div class="o"></div><div class="g"></div>
<div class="c"><img class="logo" src="file://${IMG}/logo-white.png"><div class="line"></div><div class="t">Ekskluzivna aluminijumska ulazna vrata</div></div>
<div class="s">Niš <b>·</b> Beograd <b>·</b> algreen.rs</div>
</body></html>`;

fs.writeFileSync(path.join(tmp, 'og.html'), html);
const png = path.join(tmp, 'og.png');
execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  '--window-size=1200,630', '--virtual-time-budget=8000', `--screenshot=${png}`, `file://${tmp}/og.html`,
], { stdio: 'ignore' });

for (const name of ['og-2026.jpg', 'og-default.jpg']) {
  await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(IMG, name));
  console.log('Wrote', path.join(IMG, name));
}
fs.rmSync(tmp, { recursive: true, force: true });
