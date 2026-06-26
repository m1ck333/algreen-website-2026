// Vercel serverless function — receives the contact form and emails it via Gmail SMTP.
// All credentials come from environment variables set on Vercel (never committed):
//   GMAIL_USER          the sending Gmail account
//   GMAIL_APP_PASSWORD  Google App Password for that account
//   CONTACT_TO          where inquiries are delivered
import nodemailer from 'nodemailer';

const MAX = { name: 120, email: 160, phone: 40, message: 5000 };

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Strip CR/LF so values used in subject/headers can't inject extra headers.
const oneLine = (s = '') => String(s).replace(/[\r\n]+/g, ' ').trim();
const isEmail = (s = '') => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

// Best-effort in-memory rate limit (per warm instance). Not bulletproof across
// instances, but throttles bursts cheaply with no extra infrastructure.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Same-origin guard: block cross-site browser POSTs (drive-by abuse).
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ ok: false, error: 'forbidden' });
      }
    } catch {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const honeypot = (body.company || '').toString().trim(); // hidden field; humans leave it empty

  // Silently accept bot submissions (don't tip them off), but send nothing.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!name || !email || !message || !isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
  }
  if (
    name.length > MAX.name ||
    email.length > MAX.email ||
    phone.length > MAX.phone ||
    message.length > MAX.message
  ) {
    return res.status(413).json({ ok: false, error: 'too_long' });
  }

  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `"Algreen — sajt" <${GMAIL_USER}>`,
      to: CONTACT_TO || GMAIL_USER,
      replyTo: email, // already validated to have no newlines
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
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact sendMail failed:', err?.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
