// GET /api/content → the last PUBLISHED snapshot (not drafts). Read by the static
// build (scripts/fetch-content.mjs) on every deploy. `{ v: 1, empty: true }` when
// nothing has been published yet → the build keeps the built-in defaults.
// A missing DB binding is an error (503), NOT "empty": otherwise a misconfigured
// deploy would silently publish the defaults over the client's content.
import { json, handle } from '../_lib/http.js';
import { readKv } from '../_lib/content.js';

export const onRequestGet = handle(async ({ env }) => {
  if (!env.DB) return json(503, { ok: false, error: 'no-db' }, { 'x-robots-tag': 'noindex' });
  const snap = await readKv(env.DB, 'published');
  return json(200, snap ? snap.data : { v: 1, empty: true }, { 'x-robots-tag': 'noindex' });
});
