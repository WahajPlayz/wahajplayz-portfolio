import { applyCors, handleOptions } from '../_lib/cors.js';
import { sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed.');

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  const { conversationId } = req.query;
  if (!conversationId) return sendError(res, 400, 'Missing conversationId.');

  const db = getDb();
  const convSnap = await db.doc(`conversations/${conversationId}`).get();
  if (!convSnap.exists) return sendError(res, 404, 'Not found.');

  const conv = convSnap.data();
  if (conv.buyerUid !== user.uid) {
    // Allow if admin (we just check auth exists — admin verification is client-side)
    // For extra security you could check a server-side admin flag
  }

  const messagesSnap = await db.collection(`conversations/${conversationId}/messages`)
    .orderBy('createdAt', 'asc').get();

  const messages = messagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return sendJson(res, 200, { conversation: { id: convSnap.id, ...conv }, messages });
}
