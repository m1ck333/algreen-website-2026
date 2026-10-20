// GET /api/admin/state → everything the admin UI needs on load.
import { json, handle, requireDb } from '../../_lib/http.js';
import { readSections, readKv } from '../../_lib/content.js';

export const onRequestGet = handle(async ({ env, data }) => {
  const db = requireDb(env);
  const sections = await readSections(db);
  const meta = (await readKv(db, 'publish_meta'))?.data || null;
  const lastEdit = Math.max(0, ...Object.values(sections).map((s) => s.updatedAt));
  const { results: media } = await db
    .prepare('SELECT id, kind, name, mime, size, width, height, created_at FROM media ORDER BY created_at DESC')
    .all();
  return json(200, {
    ok: true,
    user: { username: data.user.username, name: data.user.display_name || data.user.username },
    sections,
    media,
    publish: meta,
    unpublished: lastEdit > (meta?.at || 0),
    publishConfigured: !!env.GITHUB_TOKEN,
  });
});
