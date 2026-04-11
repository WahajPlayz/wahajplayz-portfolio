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
    const db = getDb();
    const snap = await db.collection('donation_conversations')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return sendJson(res, 200, { conversations });
  } catch (error) {
    console.error('donations/list failed', error);
    return sendError(res, 500, 'Failed to fetch donation conversations.');
  }
}
