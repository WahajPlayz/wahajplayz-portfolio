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

  const { data: conv, error: convError } = await getDb()
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();
  if (convError || !conv) return sendError(res, 404, 'Not found.');

  const { data: messages, error: msgError } = await getDb()
    .from('conv_messages')
    .select('id, sender_role, text, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (msgError) throw msgError;

  const conversation = {
    id: conv.id,
    orderId: conv.order_id,
    buyerUid: conv.buyer_uid,
    buyerEmail: conv.buyer_email,
    buyerName: conv.buyer_name,
    productIds: conv.product_ids,
    productNames: conv.product_names,
    createdAt: conv.created_at,
    lastMessageAt: conv.last_message_at,
    lastMessage: conv.last_message,
    unreadOwner: conv.unread_owner,
    unreadBuyer: conv.unread_buyer,
  };

  const mapped = (messages || []).map(m => ({
    id: m.id,
    senderRole: m.sender_role,
    text: m.text,
    createdAt: m.created_at,
  }));

  return sendJson(res, 200, { conversation, messages: mapped });
}
