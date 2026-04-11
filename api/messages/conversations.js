import { applyCors, handleOptions } from '../_lib/cors.js';
import { readJson, sendError, sendJson } from '../_lib/http.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';

const rowToConv = (d) => ({
  id: d.id,
  orderId: d.order_id,
  buyerUid: d.buyer_uid,
  buyerEmail: d.buyer_email,
  buyerName: d.buyer_name,
  productIds: d.product_ids,
  productNames: d.product_names,
  createdAt: d.created_at,
  lastMessageAt: d.last_message_at,
  lastMessage: d.last_message,
  unreadOwner: d.unread_owner,
  unreadBuyer: d.unread_buyer,
});

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  if (req.method === 'POST') {
    const { orderId, buyerUid, buyerEmail, buyerName, productIds, productNames } = await readJson(req);
    if (!orderId || !buyerUid) return sendError(res, 400, 'Missing orderId or buyerUid.');

    const { data: existing } = await getDb().from('conversations').select('id').eq('order_id', orderId).single();
    if (existing) {
      return sendJson(res, 200, { conversationId: existing.id });
    }

    const now = new Date().toISOString();
    const { data: created, error } = await getDb().from('conversations').insert({
      order_id: orderId,
      buyer_uid: buyerUid,
      buyer_email: buyerEmail || '',
      buyer_name: buyerName || buyerEmail || 'Buyer',
      product_ids: productIds || [],
      product_names: productNames || [],
      created_at: now,
      last_message_at: now,
      last_message: '',
      unread_owner: 0,
      unread_buyer: 0,
    }).select('id').single();

    if (error) throw error;
    return sendJson(res, 200, { conversationId: created.id });
  }

  if (req.method === 'GET') {
    const all = req.query?.all === 'true';
    let query = getDb().from('conversations').select('*').order('last_message_at', { ascending: false });
    if (!all) {
      query = query.eq('buyer_uid', user.uid);
    } else {
      query = query.limit(50);
    }
    const { data, error } = await query;
    if (error) throw error;
    return sendJson(res, 200, { conversations: (data || []).map(rowToConv) });
  }

  if (req.method === 'PATCH') {
    const { conversationId, role } = await readJson(req);
    if (!conversationId || !role) return sendError(res, 400, 'Missing fields.');
    await getDb().from('conversations').update(
      role === 'owner' ? { unread_owner: 0 } : { unread_buyer: 0 }
    ).eq('id', conversationId);
    return sendJson(res, 200, { ok: true });
  }

  return sendError(res, 405, 'Method not allowed.');
}
