import { applyCors, handleOptions } from '../_lib/cors.js';
import { readJson, sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'https://wahajplayz.org';
const FROM = process.env.RESEND_FROM || 'WahajPlayz <notifications@wahajplayz.org>';

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  try {
    const { conversationId, text } = await readJson(req);
    if (!conversationId || !text?.trim()) return sendError(res, 400, 'Missing conversationId or text.');

    const db = getDb();
    const convRef = db.doc(`donation_conversations/${conversationId}`);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return sendError(res, 404, 'Conversation not found.');

    const conv = convSnap.data();
    const now = Date.now();

    // Store reply message
    await db.collection(`donation_conversations/${conversationId}/messages`).add({
      text: text.trim(),
      senderRole: 'owner',
      senderName: 'WahajPlayz',
      createdAt: now,
    });

    // Update conversation (also cache reply text for public display)
    await convRef.update({
      replied: true,
      lastReplyAt: now,
      ownerReply: text.trim(),
    });

    // Email the donor
    if (conv.donorEmail) {
      const donorName = conv.donorName || 'Supporter';
      const amountFormatted = conv.amountGBP != null ? `£${Number(conv.amountGBP).toFixed(2)}` : 'your donation';
      await sendEmail({
        to: conv.donorEmail,
        subject: `Re: Your donation to WahajPlayz`,
        html: `
          <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
            <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">A message from WahajPlayz</h2>
            <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Thank you for your support of ${amountFormatted}, ${donorName}!</p>
            ${conv.message ? `<div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;margin-bottom:20px;color:#9ca3af;font-size:13px;font-style:italic">"${conv.message}"</div>` : ''}
            <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
              <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#00d4ff;text-transform:uppercase;letter-spacing:0.05em">Reply from WahajPlayz</p>
              <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
            </div>
            <p style="color:#4b5563;font-size:11px;margin-top:24px">This is a reply to your donation at <a href="${APP_URL}" style="color:#00d4ff">${APP_URL}</a></p>
          </div>
        `,
      });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('donations/reply failed', error);
    return sendError(res, 500, 'Failed to send reply.');
  }
}
