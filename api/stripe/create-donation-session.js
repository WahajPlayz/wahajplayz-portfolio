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
    const rawAmount = Number(body.amount);
    const amount = Number.isFinite(rawAmount) ? rawAmount : NaN;
    const currency = normalizeCurrency(body.currency);
    const message = String(body.message || '').trim().slice(0, 500);
    const username = String(body.username || '').trim().slice(0, 50);
    const returnOrigin = String(body.returnOrigin || '').replace(/\/$/, '') || getAppUrl();

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(res, 400, 'A valid donation amount is required.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${returnOrigin}/#/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/#/donate?checkout=cancel`,
      submit_type: 'donate',
      metadata: {
        kind: 'donation',
        message,
        username,
      },
      line_items: [
        {
          quantity: 1,
          price_data: await buildPriceData({
            amountInBaseCurrency: amount,
            currency,
            name: 'Support WahajPlayz',
            description: message ? `Support message: ${message}` : 'One-time support donation',
          }),
        },
      ],
      custom_text: message
        ? {
            submit: {
              message: 'Thank you for the support.',
            },
          }
        : undefined,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-donation-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create donation checkout session.');
  }
}
