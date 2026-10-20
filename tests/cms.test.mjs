// CMS API tests — run with:  npm test   (node --test, no servers, no Cloudflare)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { FakeD1, FakeR2, client, dispatch } from './harness.mjs';
import { hashPassword } from '../functions/_lib/auth.js';

const SECRET = 'test-secret-test-secret-test-secret-123';

async function setup(extraEnv = {}) {
  const env = { DB: new FakeD1(), MEDIA: new FakeR2(), SESSION_SECRET: SECRET, ...extraEnv };
  const { hash, salt, iter } = await hashPassword('correct horse battery');
  env.DB.db
    .prepare('INSERT INTO users (username, display_name, pw_hash, pw_salt, pw_iter, pw_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('monika', 'Monika', hash, salt, iter, 1000, 1000);
  return env;
}

async function loggedIn(env) {
  const c = client(env);
  const r = await c.call('POST', '/api/admin/login', { username: 'Monika', password: 'correct horse battery' });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return c;
}

const jpeg = (w = 64, h = 48) =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#c33' } }).jpeg().toBuffer();

async function upload(c, buf, name = 'foto.jpg', type = 'image/jpeg') {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type }), name);
  fd.append('width', '64');
  fd.append('height', '48');
  return c.call('POST', '/api/admin/media', fd);
}

test('login: wrong password 401, right password sets a secure session cookie', async () => {
  const env = await setup();
  const c = client(env);
  const bad = await c.call('POST', '/api/admin/login', { username: 'monika', password: 'nope' });
  assert.equal(bad.status, 401);
  const unknown = await c.call('POST', '/api/admin/login', { username: 'ghost', password: 'nope' });
  assert.equal(unknown.status, 401);
  assert.equal(bad.data.error, unknown.data.error, 'same message for unknown user');

  const ok = await c.call('POST', '/api/admin/login', { username: 'monika', password: 'correct horse battery' });
  assert.equal(ok.status, 200);
  const set = ok.res.headers.get('set-cookie');
  assert.match(set, /^__Host-algreen_admin=/);
  for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) assert.ok(set.includes(attr), attr);

  const st = await c.call('GET', '/api/admin/state');
  assert.equal(st.status, 200);
  assert.equal(st.data.user.username, 'monika');
  assert.equal(st.data.sections.gallery.data, null);
  assert.equal(st.data.unpublished, false);
});

test('auth: no cookie / forged cookie / expired-by-password-change → 401', async () => {
  const env = await setup();
  const anon = client(env);
  assert.equal((await anon.call('GET', '/api/admin/state')).status, 401);

  const c = await loggedIn(env);
  const [payload, sig] = c.cookie.split('=').slice(1).join('=').split('.');
  const forged = client(env);
  forged.cookie = `__Host-algreen_admin=${payload}.${sig.slice(0, -2)}xx`;
  assert.equal((await forged.call('GET', '/api/admin/state')).status, 401);

  // Different secret → invalid.
  const other = client({ ...env, SESSION_SECRET: SECRET.replace('test', 'evil') });
  other.cookie = c.cookie;
  assert.equal((await other.call('GET', '/api/admin/state')).status, 401);

  // Changing the password invalidates other sessions but keeps this one.
  const second = await loggedIn(env);
  const ch = await c.call('POST', '/api/admin/password', { current: 'correct horse battery', next: 'new long password 1' });
  assert.equal(ch.status, 200);
  assert.equal((await c.call('GET', '/api/admin/state')).status, 200);
  assert.equal((await second.call('GET', '/api/admin/state')).status, 401);
  const short = await c.call('POST', '/api/admin/password', { current: 'new long password 1', next: 'short' });
  assert.equal(short.status, 400);
});

test('csrf: missing X-Admin header or foreign Origin → 403', async () => {
  const env = await setup();
  const c = await loggedIn(env);
  const noHeader = await c.call('PUT', '/api/admin/section/faq', { data: [], base: 0 }, { noAdminHeader: true });
  assert.equal(noHeader.status, 403);
  const evil = client(env, { origin: 'https://evil.example' });
  evil.cookie = c.cookie;
  assert.equal((await evil.call('PUT', '/api/admin/section/faq', { data: [], base: 0 })).status, 403);
  const loginEvil = await client(env, { origin: 'https://evil.example' }).call('POST', '/api/admin/login', {
    username: 'monika',
    password: 'correct horse battery',
  });
  assert.equal(loginEvil.status, 403);
});

test('login rate limit: 8 failures → 429 even with the right password', async () => {
  const env = await setup();
  const c = client(env);
  for (let i = 0; i < 8; i++) await c.call('POST', '/api/admin/login', { username: 'monika', password: 'x' });
  const r = await c.call('POST', '/api/admin/login', { username: 'monika', password: 'correct horse battery' });
  assert.equal(r.status, 429);
});

test('upload: images/PDFs by magic bytes; junk rejected; served publicly', async () => {
  const env = await setup();
  const c = await loggedIn(env);
  const img = await upload(c, await jpeg());
  assert.equal(img.status, 200, JSON.stringify(img.data));
  assert.equal(img.data.media.kind, 'image');
  assert.match(img.data.media.id, /^[a-f0-9]{20}$/);

  const pdf = await upload(c, Buffer.from('%PDF-1.4\n%fake\n'), 'Katalog 2026.pdf', 'application/pdf');
  assert.equal(pdf.data.media.kind, 'pdf');
  assert.equal(pdf.data.media.name, 'Katalog 2026.pdf');

  // An HTML file renamed to .jpg is refused.
  const junk = await upload(c, Buffer.from('<script>alert(1)</script>'), 'x.jpg');
  assert.equal(junk.status, 415);

  const get = await dispatch(new Request(`https://algreen.rs/api/media/${img.data.media.id}`), env);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get('content-type'), 'image/jpeg');
  assert.match(get.headers.get('cache-control'), /immutable/);
  assert.equal((await dispatch(new Request('https://algreen.rs/api/media/../../etc'), env)).status, 404);

  const anon = client(env);
  assert.equal((await upload(anon, await jpeg())).status, 401);
});

test('sections: validation, normalization and optimistic concurrency', async () => {
  const env = await setup();
  const c = await loggedIn(env);
  const img = (await upload(c, await jpeg())).data.media;
  const pdf = (await upload(c, Buffer.from('%PDF-1.7 x'), 'a.pdf', 'application/pdf')).data.media;

  const gal = await c.call('PUT', '/api/admin/section/gallery', {
    base: 0,
    data: [
      { id: 'm1', media: img.id, caption: { sr: '  Vrata\u0007 Niš ', en: '' } },
      { id: 'd1', src: '/img/1.webp', caption: { sr: '', en: '' }, hidden: true },
    ],
  });
  assert.equal(gal.status, 200, JSON.stringify(gal.data));
  assert.equal(gal.data.data[0].caption.sr, 'Vrata Niš', 'trimmed + control chars stripped');

  // Stale base → 409, current version returned.
  const stale = await c.call('PUT', '/api/admin/section/gallery', { base: 0, data: [] });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.current.updatedAt, gal.data.updatedAt);

  const bad = [
    ['gallery', [{ id: 'x', src: 'https://evil/1.jpg' }]],
    ['gallery', [{ id: 'x', media: 'f'.repeat(20) }]],
    ['slots', { 'home.hero.1': pdf.id }], // a PDF is not an image
    ['docs', { catalog: img.id }],
    ['settings', { facebook: 'javascript:alert(1)', branches: [] }],
    ['announcement', { enabled: true, text: { sr: 'x', en: '' }, link: 'javascript:alert(1)' }],
    ['announcement', { enabled: true, text: { sr: '', en: '' } }],
    ['texts', { sr: { '../x': 'y' } }],
    ['nope', {}],
  ];
  for (const [name, data] of bad) {
    const base = (await c.call('GET', '/api/admin/state')).data.sections[name]?.updatedAt ?? 0;
    const r = await c.call('PUT', `/api/admin/section/${name}`, { base, data });
    assert.ok([400, 404].includes(r.status), `${name} ${JSON.stringify(data)} → ${r.status}`);
  }

  const slots = await c.call('PUT', '/api/admin/section/slots', { base: 0, data: { 'home.hero.1': img.id, 'cta.bg': '' } });
  assert.deepEqual(slots.data.data, { 'home.hero.1': img.id }, 'empty value = back to default');
  const docs = await c.call('PUT', '/api/admin/section/docs', { base: 0, data: { catalog: pdf.id } });
  assert.equal(docs.status, 200);
  const faq = await c.call('PUT', '/api/admin/section/faq', {
    base: 0,
    data: [
      { q: { sr: 'Pitanje?', en: 'Question?' }, a: { sr: 'Odgovor </script>', en: '' } },
      { q: { sr: '', en: '' }, a: { sr: '', en: '' } },
    ],
  });
  assert.equal(faq.data.data.length, 1, 'empty question dropped');

  const st = await c.call('GET', '/api/admin/state');
  assert.equal(st.data.unpublished, true);
  assert.equal(st.data.media.length, 2);

  // Reset to default with null.
  const reset = await c.call('PUT', '/api/admin/section/faq', { base: faq.data.updatedAt, data: null });
  assert.equal(reset.status, 200);
  assert.equal(reset.data.data, null);
});

test('publish: snapshot (hidden dropped, media meta), GitHub dispatch, rollback on failure', async (t) => {
  const env = await setup();
  const c = await loggedIn(env);

  // No token configured → clear error, nothing published.
  assert.equal((await c.call('POST', '/api/admin/publish')).status, 503);

  env.GITHUB_TOKEN = 'ghp_test';
  const calls = [];
  let dispatchStatus = 204;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/dispatches')) return new Response(null, { status: dispatchStatus });
    return Response.json({ workflow_runs: [{ status: 'completed', conclusion: 'success', event: 'workflow_dispatch', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }] });
  };
  t.after(() => (globalThis.fetch = realFetch));

  const img = (await upload(c, await jpeg())).data.media;
  const g = await c.call('PUT', '/api/admin/section/gallery', {
    base: 0,
    data: [
      { id: 'a', media: img.id, caption: { sr: 'Nova vrata', en: 'New door' } },
      { id: 'b', src: '/img/2.webp', caption: { sr: '', en: '' }, hidden: true },
      { id: 'c', src: '/img/3.webp', caption: { sr: '', en: '' } },
    ],
  });
  assert.equal(g.status, 200);

  const empty = await dispatch(new Request('https://algreen.rs/api/content'), env);
  assert.deepEqual(await empty.json(), { v: 1, empty: true });

  const pub = await c.call('POST', '/api/admin/publish');
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  const d = calls.find((x) => x.url.endsWith('/dispatches'));
  assert.equal(d.url, 'https://api.github.com/repos/m1ck333/algreen-website-2026/actions/workflows/deploy.yml/dispatches');
  assert.equal(JSON.parse(d.init.body).ref, 'main');
  assert.equal(d.init.headers.authorization, 'Bearer ghp_test');

  const snap = await (await dispatch(new Request('https://algreen.rs/api/content'), env)).json();
  assert.equal(snap.v, 1);
  assert.deepEqual(snap.gallery, [{ media: img.id, caption: { sr: 'Nova vrata', en: 'New door' } }, { src: '/img/3.webp' }]);
  assert.equal(snap.media[img.id].kind, 'image');
  assert.equal(snap.faq, undefined, 'untouched sections stay default');

  const st = await c.call('GET', '/api/admin/state');
  assert.equal(st.data.unpublished, false);
  const status = await c.call('GET', '/api/admin/publish');
  assert.equal(status.data.runs[0].conclusion, 'success');

  // Dispatch fails → snapshot rolled back to the previous one.
  await c.call('PUT', '/api/admin/section/gallery', { base: g.data.updatedAt, data: [] });
  dispatchStatus = 401;
  const fail = await c.call('POST', '/api/admin/publish');
  assert.equal(fail.status, 502);
  const after = await (await dispatch(new Request('https://algreen.rs/api/content'), env)).json();
  assert.equal(after.gallery.length, 2, 'live snapshot unchanged');
});

test('content API: missing DB binding is a hard error (never "empty")', async () => {
  const r = await dispatch(new Request('https://algreen.rs/api/content'), { MEDIA: new FakeR2() });
  assert.equal(r.status, 503);
});

test('garbage collection: only unreferenced uploads older than a day are deleted', async (t) => {
  const env = await setup({ GITHUB_TOKEN: 'x' });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  t.after(() => (globalThis.fetch = realFetch));
  const c = await loggedIn(env);
  const used = (await upload(c, await jpeg())).data.media;
  const old = (await upload(c, await jpeg())).data.media;
  const fresh = (await upload(c, await jpeg())).data.media;
  env.DB.db.prepare('UPDATE media SET created_at = ? WHERE id IN (?, ?)').run(Date.now() - 3 * 86400_000, used.id, old.id);
  await c.call('PUT', '/api/admin/section/slots', { base: 0, data: { 'home.hero.1': used.id } });
  assert.equal((await c.call('POST', '/api/admin/publish')).status, 200);
  const ids = env.DB.db.prepare('SELECT id FROM media').all().map((r) => r.id).sort();
  assert.deepEqual(ids, [used.id, fresh.id].sort());
  assert.equal(env.MEDIA.objects.has(`media/${old.id}`), false);
});
