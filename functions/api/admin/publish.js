// POST /api/admin/publish → freeze the drafts into the 'published' snapshot and
//   trigger the GitHub Actions deploy (static rebuild, ~2 min).
// GET  /api/admin/publish → last publish + latest deploy runs (for the status line).
//
// Env: GITHUB_TOKEN (secret; fine-grained PAT, repo "Actions: Read and write"),
//      GITHUB_REPO (default m1ck333/algreen-website-2026), GITHUB_WORKFLOW (deploy.yml),
//      GITHUB_REF (main).
import { json, handle, requireDb, requireBucket, HttpError } from '../../_lib/http.js';
import { readSections, readKv, writeKv, buildSnapshot, referencedMedia } from '../../_lib/content.js';

const gh = (env) => ({
  repo: env.GITHUB_REPO || 'm1ck333/algreen-website-2026',
  workflow: env.GITHUB_WORKFLOW || 'deploy.yml',
  ref: env.GITHUB_REF || 'main',
});

const ghFetch = (env, path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'algreen-cms',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  });

const GC_GRACE_MS = 24 * 3600 * 1000;

/** Delete uploads that neither the drafts nor the live snapshot use (older than a day). */
async function collectGarbage(env, db, sections, snap, now) {
  if (!env.MEDIA) return 0;
  const draft = Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.data]));
  const keep = new Set([...referencedMedia(draft), ...referencedMedia(snap)]);
  const { results } = await db.prepare('SELECT id FROM media WHERE created_at < ?').bind(now - GC_GRACE_MS).all();
  let n = 0;
  for (const { id } of results) {
    if (keep.has(id)) continue;
    await env.MEDIA.delete(`media/${id}`);
    await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
    n++;
  }
  return n;
}

export const onRequestPost = handle(async ({ env, data, waitUntil }) => {
  const db = requireDb(env);
  requireBucket(env);
  if (!env.GITHUB_TOKEN) throw new HttpError(503, 'Objavljivanje nije podešeno (GITHUB_TOKEN).');

  const now = Date.now();
  const sections = await readSections(db);
  const snap = await buildSnapshot(db, sections, now);
  const previous = await readKv(db, 'published');

  await writeKv(db, 'published', snap, data.user.username, now).run();

  const { repo, workflow, ref } = gh(env);
  const res = await ghFetch(env, `/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref }),
  });
  if (res.status !== 204) {
    // Roll the snapshot back so "published" keeps matching what's live.
    if (previous) await writeKv(db, 'published', previous.data, data.user.username, previous.updatedAt).run();
    else await db.prepare("DELETE FROM kv WHERE key = 'published'").run();
    console.error('github dispatch failed', res.status, await res.text().catch(() => ''));
    throw new HttpError(502, 'Pokretanje objave nije uspelo. Pokušajte ponovo za minut.');
  }

  await writeKv(db, 'publish_meta', { at: now, by: data.user.username }, data.user.username, now).run();
  const gc = collectGarbage(env, db, sections, snap, now).catch((e) => console.error('gc failed', e));
  if (waitUntil) waitUntil(gc);
  else await gc;
  return json(200, { ok: true, publishedAt: now });
});

export const onRequestGet = handle(async ({ env }) => {
  const db = requireDb(env);
  const meta = (await readKv(db, 'publish_meta'))?.data || null;
  let runs = null;
  if (env.GITHUB_TOKEN) {
    const { repo, workflow } = gh(env);
    const res = await ghFetch(env, `/repos/${repo}/actions/workflows/${workflow}/runs?per_page=3`);
    if (res.ok) {
      const body = await res.json();
      runs = (body.workflow_runs || []).map((r) => ({
        status: r.status, // queued | in_progress | completed
        conclusion: r.conclusion, // success | failure | cancelled | null
        event: r.event,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    }
  }
  return json(200, { ok: true, publish: meta, runs });
});
