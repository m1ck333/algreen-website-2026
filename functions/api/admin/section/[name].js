// PUT /api/admin/section/:name { data, base } → save one draft section.
// `base` is the updatedAt the client last saw; a mismatch means someone else
// saved in the meantime → 409 with the current version (no silent overwrite).
import { json, handle, readJson, requireDb, HttpError } from '../../../_lib/http.js';
import { SECTIONS, normalizeSection, readKv, writeKv } from '../../../_lib/content.js';

export const onRequestPut = handle(async ({ request, env, params, data: ctxData }) => {
  const db = requireDb(env);
  const name = String(params.name);
  if (!SECTIONS.includes(name)) throw new HttpError(404, 'Nepoznata sekcija.');
  const body = await readJson(request);
  const current = await readKv(db, name);
  if ((current?.updatedAt || 0) !== Number(body.base || 0)) {
    throw new HttpError(409, 'Neko je u međuvremenu sačuvao izmene. Osvežite stranicu.', { current });
  }
  const value = await normalizeSection(db, name, body.data ?? null);
  const now = Math.max(Date.now(), (current?.updatedAt || 0) + 1);
  await writeKv(db, name, value, ctxData.user.username, now).run();
  return json(200, { ok: true, data: value, updatedAt: now });
});
