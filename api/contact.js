import { applyCors, handleOptions } from './_lib/cors.js';
import { readJson, sendError, sendJson } from './_lib/http.js';
import { getDb } from './_lib/admin.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'noreply@wahajplayz.org';
const OWNER_EMAIL = process.env.OWNER_EMAIL;

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  const { name, email, subject, message } = await readJson(req);
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return sendError(res, 400, 'Name, email, and message are required.');
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(res, 400, 'Invalid email address.');
  }

  if (!RESEND_API_KEY || !OWNER_EMAIL) {
    return sendError(res, 500, 'Contact form not configured on server.');
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [OWNER_EMAIL],
      reply_to: email,
      subject: `[Contact] ${subject?.trim() || 'New message from ' + name.trim()}`,
      html: `
        <div style="font-family:monospace;background:#0d0e12;color:#e5e7eb;padding:24px;border-radius:8px;border:1px solid rgba(0,212,255,0.2)">
          <h2 style="color:#00d4ff;margin:0 0 16px">New Contact Message</h2>
          <p style="margin:0 0 8px"><strong style="color:#a855f7">From:</strong> ${escHtml(name)} &lt;${escHtml(email)}&gt;</p>
          ${subject ? `<p style="margin:0 0 8px"><strong style="color:#a855f7">Subject:</strong> ${escHtml(subject)}</p>` : ''}
          <hr style="border-color:rgba(255,255,255,0.1);margin:16px 0"/>
          <p style="white-space:pre-wrap;line-height:1.6">${escHtml(message)}</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    return sendError(res, 500, err.message || 'Failed to send message.');
  }

  // Save to Firestore so the admin panel can display it
  try {
    const db = getDb();
    const docRef = db.collection('contact_messages').doc();
    await docRef.set({
      id: docRef.id,
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || '',
      message: message.trim(),
      createdAt: Date.now(),
      read: false,
    });
  } catch { /* non-fatal — email was already sent */ }

  return sendJson(res, 200, { ok: true });
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
