import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { applyCors, handleOptions } from '../_lib/cors.js';
import { getDb } from '../_lib/admin.js';
import { getStoreProduct, grantDigitalPurchase } from '../_lib/data.js';
import { readRawBody, sendError } from '../_lib/http.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) return sendError(res, 500, 'Missing POLAR_WEBHOOK_SECRET.');

  let event;
  try {
    const payload = await readRawBody(req);
    event = validateEvent(payload, req.headers, webhookSecret);
  } catch (err) {
    if (err instanceof WebhookVerificationError) return sendError(res, 403, 'Invalid webhook signature.');
    console.error('[polar-webhook] parse error', err);
    return sendError(res, 400, 'Webhook parse error.');
  }

  console.log('[polar-webhook] event:', event.type);

  try {
    if (event.type === 'order.paid') {
      const order = event.data;
      const meta = order.metadata || {};
      const kind = meta.kind;
      const uid = String(meta.uid || '');

      if (kind === 'store') {
        const productIds = (() => {
          try { return JSON.parse(String(meta.productIds || '[]')); } catch { return []; }
        })();

        if (uid && productIds.length > 0) {
          for (const productId of productIds) {
            const product = await getStoreProduct(productId);
            if (product?.type === 'digital') {
              await grantDigitalPurchase(uid, product, order.id);
            }
          }
        }

        await getDb().from('transactions').upsert({
          id: order.id,
          kind: 'store',
          uid,
          currency: (order.currency || 'GBP').toUpperCase(),
          amount_total: order.totalAmount || 0,
          status: 'paid',
          created_at: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[polar-webhook] processing error', err);
    return sendError(res, 500, 'Webhook processing failed.');
  }
}
