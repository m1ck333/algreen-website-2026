// End-to-end: admin edits → publish → prebuild fetch → `astro build` → static HTML.
// Run with:  npm run test:build   (in-process API, no servers; rewrites dist/,
// src/data/cms.generated.json and public/m/ — cleaned up at the end).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { FakeD1, FakeR2, client, dispatch } from './harness.mjs';
import { hashPassword } from '../functions/_lib/auth.js';
import { run as fetchContent } from '../scripts/fetch-content.mjs';

const env = { DB: new FakeD1(), MEDIA: new FakeR2(), SESSION_SECRET: 'x'.repeat(40), GITHUB_TOKEN: 't' };
const { hash, salt, iter } = await hashPassword('correct horse battery');
env.DB.db
  .prepare('INSERT INTO users (username, display_name, pw_hash, pw_salt, pw_iter, pw_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run('monika', 'Monika', hash, salt, iter, 1, 1);

const realFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(null, { status: 204 }); // GitHub dispatch

const c = client(env);
assert.equal((await c.call('POST', '/api/admin/login', { username: 'monika', password: 'correct horse battery' })).status, 200);

async function up(buf, name, type) {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type }), name);
  const r = await c.call('POST', '/api/admin/media', fd);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.media.id;
}
const photo = await up(await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#357' } }).jpeg().toBuffer(), 'vrata.jpg', 'image/jpeg');
const cutout = await up(await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(), 'kvaka.png', 'image/png');
const pdf = await up(Buffer.from('%PDF-1.4\n% test catalog\n'), 'Katalog ulaznih vrata 2026 — novo.pdf', 'application/pdf');

const put = async (name, data) => {
  const base = (await c.call('GET', '/api/admin/state')).data.sections[name].updatedAt;
  const r = await c.call('PUT', `/api/admin/section/${name}`, { base, data });
  assert.equal(r.status, 200, `${name}: ${JSON.stringify(r.data)}`);
};
await put('gallery', [
  { id: 'n', media: photo, caption: { sr: 'Vrata EXCLUSIVE AG 77, Niš', en: 'EXCLUSIVE AG 77 door, Niš' } },
  { id: 'd1', src: '/img/1.webp', caption: { sr: '', en: '' } },
  { id: 'd2', src: '/img/2.webp', caption: { sr: '', en: '' }, hidden: true },
]);
await put('slots', { 'home.hero.1': photo, 'equipment.handle.1': cutout });
await put('docs', { catalog: pdf });
await put('texts', { sr: { 'home.heroTitle': 'Ulazna vrata po meri', 'works.metaTitle': 'Galerija vrata | Algreen' }, en: {} });
await put('faq', [{ q: { sr: 'Da li radite subotom?', en: '' }, a: { sr: 'Da </script><b>x</b>', en: 'Yes.' } }]);
await put('settings', {
  email: 'info@algreen.rs',
  facebook: 'https://facebook.com/algreen',
  instagram: 'https://www.instagram.com/algreen.srbija/',
  whatsapp: '+381 60 000 0000',
  branches: [
    { id: 'nis', city: { sr: 'Niš', en: 'Nis' }, street: { sr: 'Nova ulica 1', en: 'Nova street 1' }, postal: { sr: '18000 Niš, Srbija', en: '18000 Nis, Serbia' }, phones: ['+381 18 111 222'], email: 'nis@algreen.rs', mapsUrl: 'https://maps.google.com/?q=x' },
  ],
});
await put('announcement', { enabled: true, text: { sr: 'Kolektivni odmor 1–15. avgust', en: 'Closed Aug 1–15' }, link: '/kontakt/', linkLabel: { sr: 'Kontakt', en: '' } });
assert.equal((await c.call('POST', '/api/admin/publish')).status, 200);
globalThis.fetch = realFetch;

// Prebuild step against the in-process API.
await fetchContent({ base: 'https://algreen.rs', fetch: (url) => dispatch(new Request(url), env) });
const gen = JSON.parse(fs.readFileSync('src/data/cms.generated.json', 'utf8'));
assert.deepEqual(gen.media[photo].variants.map((v) => v.w), [480, 960, 1600]);
assert.deepEqual(gen.media[cutout].variants.map((v) => v.w), [300]);
assert.ok(fs.existsSync(`public/m/${photo}-1600.webp`));
assert.equal(gen.media[pdf].href, `/m/${pdf}/Katalog-ulaznih-vrata-2026-novo.pdf`);
assert.ok(fs.existsSync(`public${gen.media[pdf].href}`));
const meta = await sharp(`public/m/${cutout}-300.webp`).metadata();
assert.equal(meta.hasAlpha, true, 'transparency kept');

execFileSync('npx', ['astro', 'build'], { stdio: 'inherit' });
const read = (p) => fs.readFileSync(`dist/${p}`, 'utf8');

const home = read('index.html');
assert.ok(home.includes(`/m/${photo}-480.webp 480w, /m/${photo}-960.webp 960w, /m/${photo}-1600.webp 1600w`), 'hero srcset');
assert.ok(home.includes(`<link rel="preload" as="image" href="/m/${photo}-1600.webp"`), 'LCP preload follows replacement');
assert.ok(home.includes('Ulazna vrata po meri'), 'text override');
assert.ok(home.includes(`href="/m/${pdf}/Katalog-ulaznih-vrata-2026-novo.pdf"`), 'catalog tile → new PDF');
assert.ok(home.includes('Da li radite subotom?'), 'FAQ replaced');
assert.ok(!home.includes('Od kog materijala su vaša ulazna vrata?'), 'old FAQ gone');
assert.ok(home.includes('Da \\u003c/script>\\u003cb>x\\u003c/b>'), 'JSON-LD escaped');
assert.ok(home.includes('Da &lt;/script&gt;&lt;b&gt;x&lt;/b&gt;'), 'FAQ text HTML-escaped');
assert.ok(home.includes('Kolektivni odmor 1–15. avgust'), 'announcement');
assert.ok(home.includes('+381 18 111 222') && home.includes('tel:+38118111222'), 'phone from settings');
assert.ok(home.includes('Nova ulica 1'), 'address in JSON-LD/footer');
assert.ok(home.includes('https://wa.me/381600000000'), 'whatsapp');
assert.ok(read('kontakt/index.html').includes('Nova ulica 1'));
assert.ok(read('en/index.html').includes('Closed Aug 1–15'));
assert.ok(read('en/index.html').includes('Yes.'), 'EN FAQ');

const works = read('radovi/index.html');
assert.ok(works.includes('alt="Vrata EXCLUSIVE AG 77, Niš — Algreen"'), 'caption → alt');
assert.ok(works.includes(`data-src="/m/${photo}-1600.webp"`));
assert.ok(works.includes('data-lightbox-caption'), 'lightbox caption slot');
assert.ok(works.includes('/img/1.webp') && !works.includes('/img/2-600.webp'), 'hidden photo dropped');
assert.ok(works.includes('<title>Galerija vrata | Algreen</title>'), 'meta title override');
assert.ok(read('en/works/index.html').includes('alt="EXCLUSIVE AG 77 door, Niš — Algreen"'));
assert.ok(read('oprema/index.html').includes(`/m/${cutout}-300.webp`), 'equipment slot');
assert.ok(!read('sitemap.xml').includes('admin'), 'admin not in sitemap');
assert.ok(read('admin/index.html').includes('noindex'), 'admin noindex');

// Clean up generated content so the next normal build uses defaults again.
fs.rmSync('src/data/cms.generated.json', { force: true });
fs.rmSync('public/m', { recursive: true, force: true });
console.log('\nE2E OK — admin edits flow into static HTML.');
