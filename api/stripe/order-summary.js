import { applyCors, handleOptions } from '../_lib/cors.js';
import { getStripe } from '../_lib/stripe.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const body = await readJson(req);
    const sessionId = String(body.sessionId || '');
    if (!sessionId) {
      return sendError(res, 400, 'A sessionId is required.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.kind !== 'store') {
      return sendError(res, 400, 'This session is not a store purchase.');
    }

    const productIds = (() => { try { return JSON.parse(session.metadata?.productIds || '[]'); } catch { return []; } })();
    const productNames = (() => { try { return JSON.parse(session.metadata?.productNames || '[]'); } catch { return []; } })();
    const variantLabels = (() => { try { return JSON.parse(session.metadata?.variantLabels || '[]'); } catch { return []; } })();
    const quantities = (() => { try { return JSON.parse(session.metadata?.quantities || '[]'); } catch { return []; } })();

    const products = productIds.map((id, i) => ({
      id,
      name: productNames[i] || id,
      variant: variantLabels[i] || '',
      quantity: quantities[i] || 1,
    }));

    const shipping = session.shipping_details?.address;

    return res.status(200).json({
      orderId: session.id,
      customerName: session.customer_details?.name || '',
      customerEmail: session.customer_details?.email || '',
      shippingName: session.shipping_details?.name || '',
      shippingAddress: shipping ? {
        line1: shipping.line1 || '',
        line2: shipping.line2 || '',
        city: shipping.city || '',
        state: shipping.state || '',
        postalCode: shipping.postal_code || '',
        country: shipping.country || '',
      } : null,
      products,
      amountTotal: session.amount_total || 0,
      currency: session.currency?.toUpperCase() || 'GBP',
      createdAt: new Date(session.created * 1000).toISOString(),
    });
  } catch (error) {
    console.error('order-summary failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to retrieve order summary.');
  }
}
