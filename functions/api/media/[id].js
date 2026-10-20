// GET /api/media/:id → an uploaded file from R2 (used by the admin previews and
// by the static build, which copies the files into /m/). Ids are random and
// never reused, so responses are cacheable forever.
import { json } from '../../_lib/http.js';

export async function onRequestGet({ env, params }) {
  const id = String(params.id);
  if (!/^[a-f0-9]{20}$/.test(id) || !env.MEDIA) return json(404, { ok: false, error: 'not found' });
  const obj = await env.MEDIA.get(`media/${id}`);
  if (!obj) return json(404, { ok: false, error: 'not found' });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-robots-tag', 'noindex');
  return new Response(obj.body, { headers });
}
