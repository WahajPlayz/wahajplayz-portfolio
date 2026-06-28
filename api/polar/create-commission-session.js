import { applyCors, handleOptions } from '../_lib/cors.js';
import { getPolar, getAppUrl, resolveCurrency, buildPolarPricesArray, toMinorUnits } from '../_lib/polar.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const body = await readJson(req);
    const serviceName = String(body.serviceName || '').trim().slice(0, 200);
    const description = String(body.description || '').trim().slice(0, 1000);
    const contact = String(body.contact || '').trim().slice(0, 200);
    const basePrice = Number(body.basePrice);
    const returnOrigin = String(body.returnOrigin || '').replace(/\/$/, '') || getAppUrl();
    const userCurrency = resolveCurrency(String(body.currency || 'GBP'));

    if (!serviceName) return sendError(res, 400, 'Service name is required.');
    if (!description) return sendError(res, 400, 'Description is required.');
    if (!contact) return sendError(res, 400, 'Contact info is required.');
    if (!Number.isFinite(basePrice) || basePrice <= 0)
      return sendError(res, 400, 'A valid price is required.');

    // Build multi-currency prices from frontend's map. Fall back to GBP-only if missing.
    let prices = buildPolarPricesArray(body.pricesByCurrency);
    if (prices.length === 0) {
      prices = [{
        amountType: 'fixed',
        priceAmount: toMinorUnits(basePrice, 'gbp'),
        priceCurrency: 'gbp',
      }];
    }

    const polar = getPolar();

    const product = await polar.products.create({
      name: `Commission: ${serviceName}`,
      prices,
    });

    // If user's currency isn't in the product's prices, fall back to GBP for the checkout.
    const hasUserCurrencyPrice = prices.some((p) => p.priceCurrency === userCurrency);
    const checkoutCurrency = hasUserCurrencyPrice ? userCurrency : 'gbp';

    const checkout = await polar.checkouts.create({
      products: [product.id],
      currency: checkoutCurrency,
      metadata: {
        kind: 'commission',
        service: serviceName,
        description: description.slice(0, 500),
        contact,
      },
      successUrl: `${returnOrigin}/#/commissions?checkout=success&checkout_id={CHECKOUT_ID}`,
      returnUrl: `${returnOrigin}/#/commissions`,
    });

    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    console.error('polar create-commission-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create commission checkout.');
  }
}
