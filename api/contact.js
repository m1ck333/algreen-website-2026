// Vercel serverless function — receives the contact form and emails it via Gmail SMTP.
// All credentials come from environment variables set on Vercel (never committed):
//   GMAIL_USER          the sending Gmail account
//   GMAIL_APP_PASSWORD  Google App Password for that account
//   CONTACT_TO          where inquiries are delivered
import nodemailer from 'nodemailer';

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const isEmail = (s = '') => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Vercel auto-parses JSON / urlencoded bodies.
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const message = (body.message || '').trim();
  const honeypot = (body.company || '').trim(); // hidden field; humans leave it empty

  // Silently accept bot submissions (don't tip them off), but send nothing.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!name || !email || !message || !isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'invalid_input' });
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
      replyTo: email,
      subject: `Novi upit sa sajta — ${name}`,
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
