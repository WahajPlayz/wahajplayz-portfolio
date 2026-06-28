import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken } from '../_lib/admin.js';
import { getPolar, getAppUrl, resolveCurrency, buildPolarPricesArray, toMinorUnits } from '../_lib/polar.js';
import { getMembershipTier, saveMembershipTierPolarId } from '../_lib/data.js';
import { readJson, sendError } from '../_lib/http.js';

const billingProductField = {
  monthly: 'polarMonthlyId',
  yearly: 'polarYearlyId',
  lifetime: 'polarLifetimeId',
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) return sendError(res, 401, 'You must be signed in.');

    const { tierId, billing, currency: currencyRaw, pricesByCurrency } = await readJson(req);
    const userCurrency = resolveCurrency(currencyRaw);
    const productField = billingProductField[billing];
    if (!tierId || !productField) return sendError(res, 400, 'Invalid tier or billing cycle.');

    const tier = await getMembershipTier(tierId);
    if (!tier) return sendError(res, 404, 'Membership tier not found.');
    if (billing === 'lifetime' && tier.lifetimeEnabled === false)
      return sendError(res, 400, 'Lifetime access is not enabled for this tier.');

    let prices = buildPolarPricesArray(pricesByCurrency);

    // Fallback: if frontend didn't send a valid prices map (e.g. stale build, rates not loaded),
    // use the tier's GBP price as a single-currency baseline so checkout still works.
    if (prices.length === 0) {
      const gbpPrice = billing === 'monthly' ? tier.monthlyPrice
        : billing === 'yearly' ? tier.yearlyPrice
        : tier.lifetimePrice;
      if (!gbpPrice || gbpPrice <= 0) {
        return sendError(res, 400, `No price set for this tier (${billing}). Configure it in the admin panel.`);
      }
      prices = [{
        amountType: 'fixed',
        priceAmount: toMinorUnits(gbpPrice, 'gbp'),
        priceCurrency: 'gbp',
      }];
    }

    const polar = getPolar();
    let polarProductId = tier[productField];

    // Auto-create the Polar product if not yet set up for this tier × billing cycle.
    // Then persist the ID back to Supabase so subsequent users reuse the same product.
    if (!polarProductId) {
      const productName = `${tier.name} — ${billing}`;
      const createPayload = {
        name: productName,
        prices,
      };
      if (billing === 'monthly' || billing === 'yearly') {
        createPayload.recurringInterval = billing === 'monthly' ? 'month' : 'year';
      }
      const created = await polar.products.create(createPayload);
      polarProductId = created.id;
      await saveMembershipTierPolarId(tierId, productField, polarProductId);
    } else {
      // Existing product — refresh its prices with fresh exchange rates.
      // Polar replaces all prices on update. Existing subscribers aren't affected
      // (Polar snapshots prices into subscriptions at signup).
      await polar.products.update({ id: polarProductId, productUpdate: { prices } });
    }

    const hasUserCurrencyPrice = prices.some((p) => p.priceCurrency === userCurrency);
    const checkoutCurrency = hasUserCurrencyPrice ? userCurrency : 'gbp';
    const origin = getAppUrl();

    const checkout = await polar.checkouts.create({
      products: [polarProductId],
      currency: checkoutCurrency,
      externalCustomerId: decodedToken.uid,
      metadata: {
        kind: 'membership',
        uid: decodedToken.uid,
        tierId: tier.id,
        billing,
      },
      successUrl: `${origin}/#/profile?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${origin}/#/membership`,
    });

    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    console.error('polar create-membership-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create membership checkout.');
  }
}
