// POST /api/admin/login { username, password } → sets the session cookie.
import { json, handle, readJson, clientIp, requireDb, HttpError } from '../../_lib/http.js';
import { verifyPassword, signSession, sessionCookie, assertNotLocked, recordFailure, clearFailures } from '../../_lib/auth.js';

export const onRequestPost = handle(async ({ request, env }) => {
  const db = requireDb(env);
  const body = await readJson(request, 10_000);
  const username = String(body.username || '').trim().toLowerCase().slice(0, 60);
  const password = String(body.password || '');
  if (!username || !password) throw new HttpError(400, 'Unesite korisničko ime i lozinku.');

  const keys = [`ip:${clientIp(request)}`, `user:${username}`];
  await assertNotLocked(db, keys);

  const user = await db
    .prepare('SELECT id, username, display_name, pw_hash, pw_salt, pw_iter, pw_changed_at FROM users WHERE username = ?')
    .bind(username)
    .first();
  // Always run PBKDF2 (dummy for unknown users) so timing doesn't reveal usernames.
  const ok = await verifyPassword(
    password,
    user || { pw_salt: 'AAAAAAAAAAAAAAAAAAAAAA==', pw_iter: 100_000, pw_hash: 'x' },
  );
  if (!user || !ok) {
    await recordFailure(db, keys);
    throw new HttpError(401, 'Pogrešno korisničko ime ili lozinka.');
  }
  await clearFailures(db, keys);

  const token = await signSession(env, user);
  return json(
    200,
    { ok: true, user: { username: user.username, name: user.display_name || user.username } },
    { 'set-cookie': sessionCookie(token) },
  );
});
