import { applyCors, handleOptions } from '../_lib/cors.js';
import { sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.');

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  try {
    const { data: conversations, error: dbError } = await getDb()
      .from('donations')
      .select('id, donor_name, donor_email, amount_gbp, amount_original, currency_original, message, created_at, replied, last_reply_at, owner_reply')
      .order('created_at', { ascending: false })
      .limit(100);

    if (dbError) throw dbError;

    const mapped = (conversations || []).map(d => ({
      id: d.id,
      donorName: d.donor_name,
      donorEmail: d.donor_email,
      amountGBP: d.amount_gbp,
      amountOriginal: d.amount_original,
      currencyOriginal: d.currency_original,
      message: d.message,
      createdAt: d.created_at,
      replied: d.replied,
      lastReplyAt: d.last_reply_at,
      ownerReply: d.owner_reply,
    }));
    return sendJson(res, 200, { conversations: mapped });
  } catch (error) {
    console.error('donations/list failed', error);
    return sendError(res, 500, 'Failed to fetch donation conversations.');
  }
}
