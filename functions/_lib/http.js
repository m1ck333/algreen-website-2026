// Shared helpers for the CMS Pages Functions (admin + public content API).

export const json = (status, obj, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

/** Error with an HTTP status and a short Serbian message the admin UI shows as-is. */
export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Wrap a handler: HttpError → JSON error response; anything else → logged 500. */
export const handle = (fn) => async (ctx) => {
  try {
    return await fn(ctx);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { ok: false, error: e.message, ...e.extra });
    console.error('cms error', e && e.stack ? e.stack : e);
    // env.DEV_ERRORS is only set by the local dev backend (scripts/dev-cms.mjs).
    const detail = ctx.env?.DEV_ERRORS ? ` [dev: ${e?.message || e}]` : '';
    return json(500, { ok: false, error: `Greška na serveru. Pokušajte ponovo.${detail}` });
  }
};

export async function readJson(request, maxBytes = 2_000_000) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, 'Zahtev je prevelik.');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Zahtev je prevelik.');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Neispravan zahtev.');
  }
}

export const clientIp = (request) =>
  (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();

/** The CMS needs D1 (+ R2 for files). Missing bindings → clear 503 instead of a crash. */
export function requireDb(env) {
  if (!env.DB) throw new HttpError(503, 'Baza nije podešena (D1 binding DB).');
  return env.DB;
}
export function requireBucket(env) {
  if (!env.MEDIA) throw new HttpError(503, 'Skladište fajlova nije podešeno (R2 binding MEDIA).');
  return env.MEDIA;
}
