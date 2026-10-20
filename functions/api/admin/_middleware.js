// Guards every /api/admin/* route:
//  1. CSRF: state-changing requests must carry `X-Admin: 1` (a custom header a
//     cross-site form can't send) and, when present, a same-host Origin.
//  2. Auth: a valid session cookie (except for /api/admin/login).
// The resolved user is passed to handlers as `data.user`.
import { json, handle } from '../../_lib/http.js';
import { sessionUser } from '../../_lib/auth.js';

const PUBLIC = new Set(['/api/admin/login']);

export const onRequest = handle(async (ctx) => {
  const { request, env, data, next } = ctx;
  const url = new URL(request.url);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.headers.get('x-admin') !== '1') return json(403, { ok: false, error: 'forbidden' });
    const origin = request.headers.get('origin');
    if (origin) {
      let host = null;
      try {
        host = new URL(origin).host;
      } catch {
        /* invalid */
      }
      if (host !== url.host) return json(403, { ok: false, error: 'forbidden' });
    }
  }

  if (!PUBLIC.has(url.pathname)) {
    const user = await sessionUser(request, env);
    if (!user) return json(401, { ok: false, error: 'Niste prijavljeni.' });
    data.user = user;
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('cache-control', 'no-store');
  out.headers.set('x-robots-tag', 'noindex, nofollow');
  return out;
});
