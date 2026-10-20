// POST /api/admin/password { current, next } → change own password.
// Bumps pw_changed_at, which invalidates all other sessions; this one is re-issued.
import { json, handle, readJson, requireDb, HttpError } from '../../_lib/http.js';
import { verifyPassword, hashPassword, validateNewPassword, signSession, sessionCookie } from '../../_lib/auth.js';

export const onRequestPost = handle(async ({ request, env, data }) => {
  const db = requireDb(env);
  const body = await readJson(request, 10_000);
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(data.user.id).first();
  if (!user || !(await verifyPassword(String(body.current || ''), user))) {
    throw new HttpError(400, 'Trenutna lozinka nije tačna.');
  }
  validateNewPassword(body.next);
  const { hash, salt, iter } = await hashPassword(body.next);
  const now = Date.now();
  await db
    .prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, pw_changed_at = ? WHERE id = ?')
    .bind(hash, salt, iter, now, user.id)
    .run();
  const token = await signSession(env, { id: user.id, pw_changed_at: now });
  return json(200, { ok: true }, { 'set-cookie': sessionCookie(token) });
});
