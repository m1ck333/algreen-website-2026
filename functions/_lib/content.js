// CMS content model: section validation/normalization, publish snapshot, media refs.
// Everything the admin saves passes through `normalizeSection` — the static build
// (scripts/fetch-content.mjs) re-checks URLs as a second line of defence.
import { HttpError } from './http.js';

export const SECTIONS = ['gallery', 'slots', 'docs', 'faq', 'texts', 'settings', 'announcement'];

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function str(v, max, field) {
  if (v == null) return '';
  if (typeof v !== 'string') throw new HttpError(400, `Neispravna vrednost: ${field}`);
  const s = v.replace(CTRL, '').trim();
  if (s.length > max) throw new HttpError(400, `Predugačak tekst (${field}, najviše ${max} karaktera).`);
  return s;
}

const l10n = (v, max, field) => ({ sr: str(v?.sr, max, field), en: str(v?.en, max, field) });

/** Public link: http(s), mailto:, tel:, or a site-relative path. Empty allowed. */
export function safeUrl(v, field) {
  const s = str(v, 1000, field);
  if (!s) return '';
  if (/^\/(?!\/)/.test(s)) return s;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) {
    try {
      if (/^https?:/i.test(s)) new URL(s);
      return s;
    } catch {
      /* fall through */
    }
  }
  throw new HttpError(400, `Neispravan link (${field}). Mora početi sa https://`);
}

function email(v, field) {
  const s = str(v, 160, field);
  if (s && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) throw new HttpError(400, `Neispravna e-mail adresa (${field}).`);
  return s;
}

const KEY = /^[a-z][a-z0-9.]{0,60}$/;
const ID = /^[a-f0-9]{20}$/;
const BUILTIN_GALLERY = /^\/img\/\d{1,3}\.webp$/;

/** Map of media id → { kind } for the ids we need to validate references against. */
async function mediaKinds(db, ids) {
  const out = new Map();
  const list = [...new Set(ids)].filter((id) => ID.test(id));
  for (let i = 0; i < list.length; i += 50) {
    const chunk = list.slice(i, i + 50);
    const { results } = await db
      .prepare(`SELECT id, kind FROM media WHERE id IN (${chunk.map(() => '?').join(',')})`)
      .bind(...chunk)
      .all();
    for (const r of results) out.set(r.id, r.kind);
  }
  return out;
}

async function assertMedia(db, ids, kind) {
  const kinds = await mediaKinds(db, ids);
  for (const id of ids) {
    if (kinds.get(id) !== kind) throw new HttpError(400, 'Fajl ne postoji ili je pogrešnog tipa.');
  }
}

/** Validate + normalize one section's data. `null` = "use the site default". */
export async function normalizeSection(db, name, data) {
  if (data === null) return null;
  switch (name) {
    case 'gallery': {
      if (!Array.isArray(data) || data.length > 500) throw new HttpError(400, 'Neispravna galerija.');
      const seen = new Set();
      const items = data.map((it, i) => {
        const id = str(it?.id, 40, 'id') || `g${i}`;
        if (seen.has(id)) throw new HttpError(400, 'Duplirana stavka galerije.');
        seen.add(id);
        const out = { id, caption: l10n(it?.caption, 300, 'opis slike'), hidden: !!it?.hidden };
        if (typeof it?.media === 'string' && it.media) out.media = it.media;
        else if (typeof it?.src === 'string' && BUILTIN_GALLERY.test(it.src)) out.src = it.src;
        else throw new HttpError(400, 'Stavka galerije nema sliku.');
        return out;
      });
      await assertMedia(db, items.filter((x) => x.media).map((x) => x.media), 'image');
      return items;
    }
    case 'slots':
    case 'docs': {
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Neispravni podaci.');
      const out = {};
      for (const [k, v] of Object.entries(data)) {
        if (!KEY.test(k)) throw new HttpError(400, 'Neispravan ključ.');
        if (v == null || v === '') continue; // removed → back to default
        if (typeof v !== 'string') throw new HttpError(400, 'Neispravna vrednost.');
        out[k] = v;
      }
      if (Object.keys(out).length > 300) throw new HttpError(400, 'Previše stavki.');
      await assertMedia(db, Object.values(out), name === 'slots' ? 'image' : 'pdf');
      return out;
    }
    case 'faq': {
      if (!Array.isArray(data) || data.length > 60) throw new HttpError(400, 'Neispravna pitanja.');
      return data
        .map((f) => ({ q: l10n(f?.q, 300, 'pitanje'), a: l10n(f?.a, 3000, 'odgovor') }))
        .filter((f) => f.q.sr && f.a.sr);
    }
    case 'texts': {
      if (!data || typeof data !== 'object') throw new HttpError(400, 'Neispravni tekstovi.');
      const out = { sr: {}, en: {} };
      let n = 0;
      for (const lang of ['sr', 'en']) {
        for (const [p, v] of Object.entries(data[lang] || {})) {
          if (!/^[A-Za-z0-9_.]{1,120}$/.test(p)) throw new HttpError(400, 'Neispravan ključ teksta.');
          const s = str(v, 5000, p);
          if (s) out[lang][p] = s;
          if (++n > 3000) throw new HttpError(400, 'Previše tekstova.');
        }
      }
      return out;
    }
    case 'settings': {
      if (!data || typeof data !== 'object') throw new HttpError(400, 'Neispravna podešavanja.');
      const branches = Array.isArray(data.branches) ? data.branches.slice(0, 10) : [];
      return {
        email: email(data.email, 'e-mail'),
        facebook: safeUrl(data.facebook, 'Facebook'),
        instagram: safeUrl(data.instagram, 'Instagram'),
        whatsapp: str(data.whatsapp, 40, 'WhatsApp'),
        branches: branches.map((b) => ({
          id: str(b?.id, 40, 'id'),
          city: l10n(b?.city, 80, 'grad'),
          street: l10n(b?.street, 160, 'ulica'),
          postal: l10n(b?.postal, 160, 'poštanski broj'),
          phones: (Array.isArray(b?.phones) ? b.phones : []).slice(0, 8).map((p) => str(p, 40, 'telefon')).filter(Boolean),
          email: email(b?.email, 'e-mail poslovnice'),
          mapsUrl: safeUrl(b?.mapsUrl, 'link mape'),
        })),
      };
    }
    case 'announcement': {
      if (!data || typeof data !== 'object') throw new HttpError(400, 'Neispravno obaveštenje.');
      const out = {
        enabled: !!data.enabled,
        text: l10n(data.text, 300, 'tekst obaveštenja'),
        link: safeUrl(data.link, 'link obaveštenja'),
        linkLabel: l10n(data.linkLabel, 60, 'tekst linka'),
      };
      if (out.enabled && !out.text.sr) throw new HttpError(400, 'Unesite tekst obaveštenja.');
      return out;
    }
    default:
      throw new HttpError(404, 'Nepoznata sekcija.');
  }
}

export async function readSections(db) {
  const { results } = await db
    .prepare(`SELECT key, value, updated_at, updated_by FROM kv WHERE key IN (${SECTIONS.map(() => '?').join(',')})`)
    .bind(...SECTIONS)
    .all();
  const out = {};
  for (const name of SECTIONS) out[name] = { data: null, updatedAt: 0, updatedBy: null };
  for (const r of results) out[r.key] = { data: JSON.parse(r.value), updatedAt: r.updated_at, updatedBy: r.updated_by };
  return out;
}

export async function readKv(db, key) {
  const row = await db.prepare('SELECT value, updated_at FROM kv WHERE key = ?').bind(key).first();
  return row ? { data: JSON.parse(row.value), updatedAt: row.updated_at } : null;
}

export function writeKv(db, key, value, by, now = Date.now()) {
  return db
    .prepare(
      `INSERT INTO kv (key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3, updated_by = ?4`,
    )
    .bind(key, JSON.stringify(value), now, by);
}

/** All media ids referenced by a set of sections (draft or snapshot shape). */
export function referencedMedia(s) {
  const ids = new Set();
  for (const it of s.gallery || []) if (it.media) ids.add(it.media);
  for (const v of Object.values(s.slots || {})) ids.add(v);
  for (const v of Object.values(s.docs || {})) ids.add(v);
  return ids;
}

/** Build the public snapshot from the draft sections (hidden gallery items dropped). */
export async function buildSnapshot(db, sections, now = Date.now()) {
  const d = Object.fromEntries(SECTIONS.map((n) => [n, sections[n]?.data ?? null]));
  const snap = { v: 1, publishedAt: new Date(now).toISOString() };
  if (d.gallery) {
    snap.gallery = d.gallery
      .filter((it) => !it.hidden)
      .map((it) => {
        const o = it.media ? { media: it.media } : { src: it.src };
        if (it.caption && (it.caption.sr || it.caption.en)) o.caption = it.caption;
        return o;
      });
  }
  if (d.slots && Object.keys(d.slots).length) snap.slots = d.slots;
  if (d.docs && Object.keys(d.docs).length) snap.docs = d.docs;
  if (d.faq) snap.faq = d.faq;
  if (d.texts && (Object.keys(d.texts.sr || {}).length || Object.keys(d.texts.en || {}).length)) snap.texts = d.texts;
  if (d.settings) snap.settings = d.settings;
  if (d.announcement && d.announcement.enabled) snap.announcement = d.announcement;

  const ids = [...referencedMedia(snap)];
  snap.media = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { results } = await db
      .prepare(`SELECT id, kind, name, mime, width, height FROM media WHERE id IN (${chunk.map(() => '?').join(',')})`)
      .bind(...chunk)
      .all();
    for (const r of results) snap.media[r.id] = { kind: r.kind, name: r.name, mime: r.mime, width: r.width, height: r.height };
  }
  return snap;
}
