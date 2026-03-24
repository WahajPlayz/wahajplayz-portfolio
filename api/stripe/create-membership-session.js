import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken } from '../_lib/admin.js';
import { getStripe, getAppUrl, normalizeCurrency, buildPriceData } from '../_lib/stripe.js';
import { getMembershipTier } from '../_lib/data.js';
import { readJson, sendError } from '../_lib/http.js';

const billingMap = {
  monthly: { priceKey: 'monthlyPrice', recurring: { interval: 'month' } },
  yearly: { priceKey: 'yearlyPrice', recurring: { interval: 'year' } },
  lifetime: { priceKey: 'lifetimePrice', recurring: null },
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) {
      return sendError(res, 401, 'You must be signed in to start membership checkout.');
    }

    const body = await readJson(req);
    const tierId = String(body.tierId || '');
    const billing = String(body.billing || 'monthly');
    const currency = normalizeCurrency(body.currency);
    const billingConfig = billingMap[billing];

    if (!tierId || !billingConfig) {
      return sendError(res, 400, 'A valid membership tier and billing cycle are required.');
    }

    const tier = await getMembershipTier(tierId);
    if (!tier) {
      return sendError(res, 404, 'Membership tier not found.');
    }
    if (billing === 'lifetime' && !tier.lifetimeEnabled) {
      return sendError(res, 400, 'Lifetime access is not enabled for this membership tier.');
    }

    const amount = Number(tier[billingConfig.priceKey]);
    const stripe = getStripe();
    const origin = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: billing === 'lifetime' ? 'payment' : 'subscription',
      client_reference_id: decodedToken.uid,
      success_url: `${origin}/#/membership?checkout=success&tier=${encodeURIComponent(tier.id)}`,
      cancel_url: `${origin}/#/membership?checkout=cancel&tier=${encodeURIComponent(tier.id)}`,
      metadata: {
        kind: 'membership',
        uid: decodedToken.uid,
        tierId: tier.id,
        billing,
      },
      line_items: [
        {
          quantity: 1,
          price_data: await buildPriceData({
            amountInBaseCurrency: amount,
            currency,
            name: `${tier.name} Membership`,
            description: tier.description,
            recurring: billingConfig.recurring || undefined,
          }),
        },
      ],
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-membership-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create membership checkout session.');
  }
}
