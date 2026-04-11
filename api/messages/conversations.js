import { applyCors, handleOptions } from '../_lib/cors.js';
import { readJson, sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  const db = getDb();

  // POST — create or get conversation for an order
  if (req.method === 'POST') {
    const { orderId, buyerUid, buyerEmail, buyerName, productIds, productNames } = await readJson(req);
    if (!orderId || !buyerUid) return sendError(res, 400, 'Missing orderId or buyerUid.');

    // Check if conversation already exists for this order
    const existing = await db.collection('conversations').where('orderId', '==', orderId).limit(1).get();
    if (!existing.empty) {
      return sendJson(res, 200, { conversationId: existing.docs[0].id });
    }

    const ref = db.collection('conversations').doc();
    await ref.set({
      orderId,
      buyerUid,
      buyerEmail: buyerEmail || '',
      buyerName: buyerName || buyerEmail || 'Buyer',
      productIds: productIds || [],
      productNames: productNames || [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      lastMessage: '',
      unreadOwner: 0,
      unreadBuyer: 0,
    });
    return sendJson(res, 200, { conversationId: ref.id });
  }

  // GET — list conversations
  if (req.method === 'GET') {
    const all = req.query?.all === 'true';
    let query;
    if (all) {
      query = db.collection('conversations').orderBy('lastMessageAt', 'desc').limit(50);
    } else {
      query = db.collection('conversations').where('buyerUid', '==', user.uid).orderBy('lastMessageAt', 'desc');
    }
    const snap = await query.get();
    const conversations = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return sendJson(res, 200, { conversations });
  }

  // PATCH — mark conversation read
  if (req.method === 'PATCH') {
    const { conversationId, role } = await readJson(req);
    if (!conversationId || !role) return sendError(res, 400, 'Missing fields.');
    await db.doc(`conversations/${conversationId}`).update(
      role === 'owner' ? { unreadOwner: 0 } : { unreadBuyer: 0 }
    );
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 405, 'Method not allowed.');
}
