// POST /api/admin/media (multipart: file, width?, height?) → store an upload in R2.
// Images are already resized/re-encoded in the browser (JPEG ≤ 2400px); the static
// build makes the webp variants. Type is decided by magic bytes, not the filename.
import { json, handle, requireDb, requireBucket, HttpError } from '../../../_lib/http.js';

const LIMITS = { image: 15 * 1024 * 1024, pdf: 40 * 1024 * 1024 };

function sniff(bytes) {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { kind: 'image', mime: 'image/png', ext: 'png' };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { kind: 'pdf', mime: 'application/pdf', ext: 'pdf' };
  return null;
}

const dim = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 20000 ? n : null;
};

export const onRequestPost = handle(async ({ request, env, data }) => {
  const db = requireDb(env);
  const bucket = requireBucket(env);
  if (Number(request.headers.get('content-length') || 0) > LIMITS.pdf + 1024 * 1024) {
    throw new HttpError(413, 'Fajl je prevelik (najviše 40 MB).');
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'Neispravan upload.');
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Nije izabran fajl.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new HttpError(415, 'Format nije podržan. Dozvoljeno: JPG, PNG, WebP ili PDF.');
  if (bytes.length > LIMITS[type.kind]) {
    throw new HttpError(413, `Fajl je prevelik (najviše ${LIMITS[type.kind] / 1024 / 1024} MB).`);
  }

  const id = [...crypto.getRandomValues(new Uint8Array(10))].map((x) => x.toString(16).padStart(2, '0')).join('');
  const name = (String(file.name || `fajl.${type.ext}`).replace(/[\u0000-\u001f"\\/]/g, '').trim() || `fajl.${type.ext}`).slice(0, 120);
  const now = Date.now();
  const row = {
    id,
    kind: type.kind,
    name,
    mime: type.mime,
    size: bytes.length,
    width: type.kind === 'image' ? dim(form.get('width')) : null,
    height: type.kind === 'image' ? dim(form.get('height')) : null,
    created_at: now,
  };
  await bucket.put(`media/${id}`, bytes, {
    httpMetadata: { contentType: type.mime },
    customMetadata: { name: encodeURIComponent(name), by: data.user.username },
  });
  await db
    .prepare('INSERT INTO media (id, kind, name, mime, size, width, height, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(row.id, row.kind, row.name, row.mime, row.size, row.width, row.height, row.created_at, data.user.username)
    .run();
  return json(200, { ok: true, media: row });
});
