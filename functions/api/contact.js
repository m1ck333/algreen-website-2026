// Cloudflare Pages Function — receives the contact form and emails it.
// Ported from the Vercel serverless handler (api/contact.js): same validation,
// honeypot, rate-limit and same-origin guards. Sends through the existing Algreen
// mailbox via Loopia SMTP (worker-mailer over the Worker's TCP socket) — the same
// proven pattern as the konfigurator app (upit@algreen.rs → info@algreen.rs).
// Config from the Pages project env:
//   SMTP_HOST   mailcluster.loopia.se
//   SMTP_PORT   "465" (implicit TLS) or "587" (STARTTLS)
//   SMTP_USER   upit@algreen.rs
//   SMTP_PASS   (secret) the mailbox password
//   CONTACT_FROM  upit@algreen.rs   (falls back to SMTP_USER)
//   CONTACT_TO    info@algreen.rs
import { WorkerMailer } from 'worker-mailer';

const MAX = { name: 120, email: 160, phone: 40, message: 5000 };

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Strip CR/LF so values used in subject/headers can't inject extra headers.
const oneLine = (s = '') => String(s).replace(/[\r\n]+/g, ' ').trim();
const isEmail = (s = '') => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

// Best-effort in-memory rate limit (per warm isolate). Not bulletproof across
// isolates, but throttles bursts cheaply with no extra infrastructure.
const HITS = (globalThis.__contactHits ??= new Map());
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const recent = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) return true;
  recent.push(now);
  HITS.set(ip, recent);
  if (HITS.size > 5000) HITS.clear(); // crude memory cap
  return false;
}

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  // Same-origin guard: block cross-site browser POSTs (drive-by abuse).
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host !== host) return json(403, { ok: false, error: 'forbidden' });
    } catch {
      return json(403, { ok: false, error: 'forbidden' });
    }
  }

  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim() || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'rate_limited' });

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const honeypot = (body.company || '').toString().trim(); // hidden field; humans leave it empty

  // Silently accept bot submissions (don't tip them off), but send nothing.
  if (honeypot) return json(200, { ok: true });

  if (!name || !email || !message || !isEmail(email)) {
    return json(400, { ok: false, error: 'invalid_input' });
  }
  if (name.length > MAX.name || email.length > MAX.email || phone.length > MAX.phone || message.length > MAX.message) {
    return json(413, { ok: false, error: 'too_long' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_FROM, CONTACT_TO } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !CONTACT_TO) {
    return json(500, { ok: false, error: 'not_configured' });
  }

  try {
    const port = Number(SMTP_PORT) || 465;
    await WorkerMailer.send(
      {
        host: SMTP_HOST,
        port,
        secure: port === 465, // implicit TLS on 465
        startTls: port === 587, // STARTTLS on 587
        credentials: { username: SMTP_USER, password: SMTP_PASS },
        authType: ['login', 'plain'],
      },
      {
        from: { name: 'Algreen — sajt', email: CONTACT_FROM || SMTP_USER },
        to: CONTACT_TO,
        reply: email, // already validated to have no newlines
        subject: `Novi upit sa sajta — ${oneLine(name)}`,
        text: `Ime: ${name}\nEmail: ${email}\nTelefon: ${phone || '—'}\n\nPoruka:\n${message}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#1f1c1c">Novi upit sa sajta</h2>
            <p><strong>Ime:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(phone) || '—'}</p>
            <p><strong>Poruka:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          </div>`,
      }
    );
    return json(200, { ok: true });
  } catch (err) {
    console.error('contact send failed:', err?.message);
    return json(502, { ok: false, error: 'send_failed' });
  }
}
// Only POST is exported → Pages auto-responds 405 to other methods.
