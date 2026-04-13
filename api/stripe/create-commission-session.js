import { applyCors, handleOptions } from '../_lib/cors.js';
import { getStripe, getAppUrl, normalizeCurrency, buildPriceData } from '../_lib/stripe.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const body = await readJson(req);
    const serviceName = String(body.serviceName || '').trim().slice(0, 200);
    const description = String(body.description || '').trim().slice(0, 1000);
    const contact = String(body.contact || '').trim().slice(0, 200);
    const basePrice = Number(body.basePrice); // GBP
    const currency = normalizeCurrency(body.currency);
    const returnOrigin = String(body.returnOrigin || '').replace(/\/$/, '') || getAppUrl();

    if (!serviceName) return sendError(res, 400, 'Service name is required.');
    if (!description) return sendError(res, 400, 'Description is required.');
    if (!contact) return sendError(res, 400, 'Contact info is required.');
    if (!Number.isFinite(basePrice) || basePrice <= 0) return sendError(res, 400, 'A valid price is required.');

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${returnOrigin}/#/commissions?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/#/commissions?checkout=cancel`,
      metadata: {
        kind: 'commission',
        service: serviceName,
        description: description.slice(0, 500),
        contact,
      },
      line_items: [
        {
          quantity: 1,
          price_data: await buildPriceData({
            amountInBaseCurrency: basePrice,
            currency,
            name: `Commission: ${serviceName}`,
            description: description.slice(0, 200),
          }),
        },
      ],
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-commission-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create commission checkout session.');
  }
}
