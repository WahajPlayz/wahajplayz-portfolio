import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) return sendError(res, 401, 'You must be signed in.');

    const { checkoutId, productId } = await readJson(req);
    if (!checkoutId || !productId) return sendError(res, 400, 'checkoutId and productId are required.');

    const uid = decodedToken.uid;

    // Check digital_purchases table — the Polar webhook will have granted access by now
    const { data: purchase } = await getDb()
      .from('digital_purchases')
      .select('status, product_id')
      .eq('user_id', uid)
      .eq('product_id', productId)
      .single();

    const status = purchase?.status ?? 'pending';
    return res.status(200).json({
      status,
      productId,
      granted: status === 'paid',
    });
  } catch (error) {
    console.error('polar verify-digital-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to verify purchase.');
  }
}
