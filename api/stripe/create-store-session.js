import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getStripe, getAppUrl, normalizeCurrency, buildPriceData } from '../_lib/stripe.js';
import { getStoreProduct } from '../_lib/data.js';
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
      return sendError(res, 401, 'You must be signed in to buy these products.');
    }

    const body = await readJson(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const currency = normalizeCurrency(body.currency);
    if (items.length === 0) {
      return sendError(res, 400, 'At least one cart item is required.');
    }

    const cartItems = [];
    for (const rawItem of items) {
      const productId = String(rawItem?.productId || '');
      const quantity = Math.max(1, Math.min(99, Number(rawItem?.quantity) || 1));
      const variantLabel = String(rawItem?.variantLabel || '');
      if (!productId) {
        return sendError(res, 400, 'Each cart item must include a productId.');
      }

      const product = await getStoreProduct(productId);
      if (!product || !product.enabled) {
        return sendError(res, 404, `Product ${productId} is not available for checkout.`);
      }
      if (product.stock === 0) {
        return sendError(res, 400, `${product.name} is out of stock.`);
      }
      if (product.stock !== null && quantity > product.stock) {
        return sendError(res, 400, `Only ${product.stock} of ${product.name} are available.`);
      }
      if (product.type === 'digital' && !product.digitalFilePath && !product.digitalFileUrl) {
        return sendError(res, 400, `${product.name} does not have a download attached.`);
      }

      if (product.type === 'digital') {
        await getDb().doc(`users/${decodedToken.uid}/digitalPurchases/${product.id}`).set({
          productId: product.id,
          productName: product.name,
          status: 'pending',
          updatedAt: Date.now(),
        }, { merge: true });
      }

      cartItems.push({ product, quantity, variantLabel });
    }

    const stripe = getStripe();
    const origin = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: decodedToken.uid,
      success_url: `${origin}/#/store?checkout=success`,
      cancel_url: `${origin}/#/store?checkout=cancel`,
      metadata: {
        kind: 'store',
        uid: decodedToken.uid,
        productIds: JSON.stringify(cartItems.map(item => item.product.id)),
      },
      line_items: await Promise.all(cartItems.map(async ({ product, quantity, variantLabel }) => ({
        quantity,
        price_data: await buildPriceData({
          amountInBaseCurrency: product.price,
          currency,
          name: product.name,
          description: variantLabel ? `${product.description} (${variantLabel})` : product.description,
        }),
      }))),
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-store-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create store checkout session.');
  }
}
