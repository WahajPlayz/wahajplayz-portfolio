import { applyCors, handleOptions } from '../_lib/cors.js';
import { sendError, sendJson } from '../_lib/http.js';
import { getDb } from '../_lib/admin.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.');

  try {
    const db = getDb();
    const snap = await db.collection('donation_conversations')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const donors = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          donorName: data.donorName || 'Anonymous',
          amountGBP: data.amountGBP || 0,
          message: data.message || '',
          createdAt: data.createdAt || 0,
          ownerReply: data.ownerReply || null,
        };
      })
      .slice(0, 50);

    return sendJson(res, 200, { donors });
  } catch (error) {
    console.error('donations/public failed', error);
    return sendError(res, 500, 'Failed to fetch donors.');
  }
}
