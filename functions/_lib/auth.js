// Admin authentication: PBKDF2 password hashes (WebCrypto) + an HMAC-signed,
// HttpOnly, SameSite=Strict session cookie. No session table — the cookie carries
// { uid, pv, exp } and `pv` (the user's pw_changed_at) must still match the DB,
// so changing the password invalidates every other session.
import { HttpError } from './http.js';

export const COOKIE = '__Host-algreen_admin';
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days
// Cloudflare Workers caps PBKDF2 at 100k iterations.
export const PBKDF2_ITER = 100_000;

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

export async function hashPassword(password, saltB64, iter = PBKDF2_ITER) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return { hash: b64(bits), salt: b64(salt), iter };
}

/** Constant-time compare of two equal-purpose strings. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, user) {
  const { hash } = await hashPassword(password, user.pw_salt, user.pw_iter);
  return safeEqual(hash, user.pw_hash);
}

export function validateNewPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError(400, 'Lozinka mora imati najmanje 10 karaktera.');
  if (pw.length > 200) throw new HttpError(400, 'Lozinka je predugačka.');
}

async function hmacKey(env) {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new HttpError(503, 'Prijava nije podešena (SESSION_SECRET).');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(env, user, now = Date.now()) {
  const payload = b64url(enc.encode(JSON.stringify({ uid: user.id, pv: user.pw_changed_at, exp: now + SESSION_TTL_MS })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export function sessionCookie(value, maxAgeMs = SESSION_TTL_MS) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

function readCookie(request) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

/** Resolve the logged-in user from the session cookie, or null. */
export async function sessionUser(request, env, now = Date.now()) {
  const token = readCookie(request);
  if (!token || !env.DB) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(env), unb64url(sig), enc.encode(payload));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    return null;
  }
  if (!ok) return null;
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(unb64url(payload)));
  } catch {
    return null;
  }
  if (!data || typeof data.exp !== 'number' || data.exp < now) return null;
  const user = await env.DB.prepare('SELECT id, username, display_name, pw_changed_at FROM users WHERE id = ?')
    .bind(data.uid)
    .first();
  if (!user || user.pw_changed_at !== data.pv) return null;
  return user;
}

// ---- Login rate limiting (D1-backed, survives isolates) -------------------
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_MAX = 8;

export async function assertNotLocked(db, keys, now = Date.now()) {
  for (const key of keys) {
    const row = await db.prepare('SELECT count, first_at FROM login_fail WHERE key = ?').bind(key).first();
    if (row && now - row.first_at < FAIL_WINDOW_MS && row.count >= FAIL_MAX) {
      throw new HttpError(429, 'Previše neuspešnih pokušaja. Pokušajte ponovo za 15 minuta.');
    }
  }
}

export async function recordFailure(db, keys, now = Date.now()) {
  for (const key of keys) {
    await db
      .prepare(
        `INSERT INTO login_fail (key, count, first_at) VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           count    = CASE WHEN ?2 - first_at >= ?3 THEN 1 ELSE count + 1 END,
           first_at = CASE WHEN ?2 - first_at >= ?3 THEN ?2 ELSE first_at END`,
      )
      .bind(key, now, FAIL_WINDOW_MS)
      .run();
  }
}

export async function clearFailures(db, keys) {
  for (const key of keys) await db.prepare('DELETE FROM login_fail WHERE key = ?').bind(key).run();
}
