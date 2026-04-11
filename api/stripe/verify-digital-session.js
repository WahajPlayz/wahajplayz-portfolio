import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getStripe } from '../_lib/stripe.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) {
      return sendError(res, 401, 'You must be signed in to verify this purchase.');
    }

    const body = await readJson(req);
    const sessionId = String(body.sessionId || '');
    if (!sessionId) {
      return sendError(res, 400, 'A sessionId is required.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.kind !== 'store' || session.metadata?.productType !== 'digital') {
      return sendError(res, 400, 'This checkout session is not a digital store purchase.');
    }
    if (session.client_reference_id !== decodedToken.uid) {
      return sendError(res, 403, 'This purchase does not belong to the current account.');
    }

    const productId = session.metadata?.productId || '';
    const { data: purchase } = await getDb().from('digital_purchases').select('status').eq('user_id', decodedToken.uid).eq('product_id', productId).single();

    if (session.payment_status === 'paid') {
      return res.status(200).json({
        status: 'paid',
        productId,
        granted: purchase?.status === 'paid',
      });
    }

    return res.status(200).json({
      status: 'pending',
      productId,
      granted: false,
    });
  } catch (error) {
    console.error('verify-digital-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to verify digital checkout session.');
  }
}
