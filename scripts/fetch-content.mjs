#!/usr/bin/env node
/**
 * Prebuild step: pull the PUBLISHED admin content into the static build.
 *
 *   CMS_URL=https://algreen.rs node scripts/fetch-content.mjs   (CI: deploy.yml)
 *
 * - GET  $CMS_URL/api/content          → src/data/cms.generated.json
 * - GET  $CMS_URL/api/media/<id>       → images rendered to public/m/<id>-<w>.webp
 *                                         (sharp, responsive widths), PDFs copied to
 *                                         public/m/<id>/<name>.pdf
 * Everything ends up as plain static files → SEO identical to hand-written pages.
 *
 * Safety:
 * - CMS_URL unset (local builds) → no-op; the site uses the built-in defaults.
 * - 404 from a non-JSON page (endpoint not deployed yet) → defaults.
 * - Any other failure (5xx, network, bad JSON) → exit 1 so the deploy FAILS and the
 *   currently live site stays up, rather than shipping the defaults over the
 *   client's content.
 * Downloads + renders are cached in .cms-cache/ (restored between CI runs).
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_JSON = path.join(ROOT, 'src/data/cms.generated.json');
const PUBLIC_M = path.join(ROOT, 'public/m');
const CACHE = path.join(ROOT, '.cms-cache');
const WIDTHS = [480, 960, 1600];
const ID = /^[a-f0-9]{20}$/;

const log = (...a) => console.log('[cms]', ...a);
// Overridable for tests (tests/cms.test.mjs routes requests to the handlers in-process).
let fetchImpl = (...a) => globalThis.fetch(...a);

async function get(url, { retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(30_000), headers: { 'user-agent': 'algreen-build' } });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`GET ${url} failed: ${lastErr?.message || lastErr}`);
}

/** Same rule as the server: http(s), mailto:, tel:, or site-relative. */
const safeUrl = (s) =>
  typeof s === 'string' && (/^\/(?!\/)/.test(s) || /^(https?:\/\/|mailto:|tel:)/i.test(s)) ? s : '';

const slug = (name) =>
  (
    name
      .replace(/\.pdf$/i, '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'dj')
      .replace(/Đ/g, 'Dj')
      .replace(/[^A-Za-z0-9._ -]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'dokument'
  ) + '.pdf';

async function clearGenerated() {
  await fs.rm(OUT_JSON, { force: true });
  await fs.rm(PUBLIC_M, { recursive: true, force: true });
}

async function download(base, id) {
  const file = path.join(CACHE, 'src', id);
  if (existsSync(file)) return file;
  const res = await get(`${base}/api/media/${id}`);
  if (!res.ok) throw new Error(`media ${id}: HTTP ${res.status}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function renderImage(src, id) {
  const meta = await sharp(src).rotate().metadata();
  // .rotate() honours EXIF orientation; width/height in metadata are pre-rotation.
  const swap = (meta.orientation || 1) >= 5;
  const w = swap ? meta.height : meta.width;
  const h = swap ? meta.width : meta.height;
  let widths = WIDTHS.filter((x) => x < w);
  if (!widths.length || w <= WIDTHS[WIDTHS.length - 1]) widths.push(Math.min(w, WIDTHS[WIDTHS.length - 1]));
  widths = [...new Set(widths)].sort((a, b) => a - b);

  const variants = [];
  for (const vw of widths) {
    const name = `${id}-${vw}.webp`;
    const cached = path.join(CACHE, 'out', name);
    if (!existsSync(cached)) {
      await fs.mkdir(path.dirname(cached), { recursive: true });
      await sharp(src).rotate().resize({ width: vw, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(cached);
    }
    await fs.copyFile(cached, path.join(PUBLIC_M, name));
    variants.push({ w: vw, src: `/m/${name}` });
  }
  return { kind: 'image', w, h, variants };
}

export async function run({ base: baseUrl = process.env.CMS_URL || '', fetch: f } = {}) {
  if (f) fetchImpl = f;
  const base = baseUrl.replace(/\/+$/, '');
  if (!base) {
    log('CMS_URL not set — building with built-in content (local build).');
    return;
  }

  const res = await get(`${base}/api/content`);
  const type = res.headers.get('content-type') || '';
  if (res.status === 404 && !type.includes('json')) {
    log('content endpoint not deployed yet (404) — building with built-in defaults.');
    await clearGenerated();
    return;
  }
  if (!res.ok) throw new Error(`/api/content: HTTP ${res.status}`);
  const snap = await res.json();
  if (!snap || snap.v !== 1) throw new Error('/api/content: unexpected payload');
  if (snap.empty) {
    log('nothing published yet — building with built-in defaults.');
    await clearGenerated();
    return;
  }

  await clearGenerated();
  await fs.mkdir(PUBLIC_M, { recursive: true });

  // Second line of defence for links (server validates too).
  if (snap.settings) {
    for (const k of ['facebook', 'instagram']) snap.settings[k] = safeUrl(snap.settings[k]);
    for (const b of snap.settings.branches || []) b.mapsUrl = safeUrl(b.mapsUrl);
  }
  if (snap.announcement) snap.announcement.link = safeUrl(snap.announcement.link);

  const media = {};
  const ids = Object.keys(snap.media || {}).filter((id) => ID.test(id));
  for (const id of ids) {
    const m = snap.media[id];
    const src = await download(base, id);
    if (m.kind === 'image') {
      media[id] = await renderImage(src, id);
    } else if (m.kind === 'pdf') {
      const name = slug(m.name || 'dokument.pdf');
      await fs.mkdir(path.join(PUBLIC_M, id), { recursive: true });
      await fs.copyFile(src, path.join(PUBLIC_M, id, name));
      media[id] = { kind: 'pdf', href: `/m/${id}/${name}`, name: m.name };
    }
  }

  const out = { ...snap, media };
  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify(out, null, 2));
  log(`published ${snap.publishedAt}: ${ids.length} file(s), gallery=${snap.gallery?.length ?? 'default'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((e) => {
    console.error('[cms] FAILED:', e.message);
    process.exit(1);
  });
}
