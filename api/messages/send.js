import { applyCors, handleOptions } from '../_lib/cors.js';
import { readJson, sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = process.env.OWNER_EMAIL;
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

  const { conversationId, text, senderRole } = await readJson(req);
  if (!conversationId || !text?.trim() || !senderRole) return sendError(res, 400, 'Missing fields.');

  const { data: conv, error: convError } = await getDb()
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  if (convError || !conv) return sendError(res, 404, 'Conversation not found.');

  if (senderRole === 'buyer' && conv.buyer_uid !== user.uid) return sendError(res, 403, 'Forbidden.');

  const now = new Date().toISOString();

  await getDb().from('conv_messages').insert({
    conversation_id: conversationId,
    sender_role: senderRole,
    text: text.trim(),
    created_at: now,
  });

  await getDb().from('conversations').update({
    last_message: text.trim().slice(0, 120),
    last_message_at: now,
    unread_owner: senderRole === 'buyer' ? (conv.unread_owner || 0) + 1 : conv.unread_owner || 0,
    unread_buyer: senderRole === 'owner' ? (conv.unread_buyer || 0) + 1 : conv.unread_buyer || 0,
  }).eq('id', conversationId);

  const productName = (conv.product_names)?.[0] || 'your order';
  if (senderRole === 'owner' && conv.buyer_email) {
    await sendEmail({
      to: conv.buyer_email,
      subject: `New message about your order — ${productName}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
          <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">You have a new message</h2>
          <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Regarding: <strong style="color:#fff">${productName}</strong></p>
          <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
          </div>
          <a href="${APP_URL}/#/messages" style="display:inline-block;background:#00d4ff;color:#000;font-weight:bold;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px">View & Reply</a>
          <p style="color:#4b5563;font-size:11px;margin-top:24px">You can reply on the website at ${APP_URL}/#/messages</p>
        </div>
      `,
    });
  } else if (senderRole === 'buyer' && OWNER_EMAIL) {
    await sendEmail({
      to: OWNER_EMAIL,
      subject: `New message from buyer — ${productName}`,
      html: `
        <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
          <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">New message from ${conv.buyer_name || conv.buyer_email}</h2>
          <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Order: <strong style="color:#fff">${productName}</strong></p>
          <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
          </div>
          <p style="color:#4b5563;font-size:11px;margin-top:24px">Reply from your Admin Panel → Orders & Messages tab.</p>
        </div>
      `,
    });
  }

  return sendJson(res, 200, { ok: true });
}
