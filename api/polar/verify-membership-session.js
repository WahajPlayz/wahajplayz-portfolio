import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getPolar } from '../_lib/polar.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) return sendError(res, 401, 'You must be signed in.');

    const { checkoutId } = await readJson(req);
    if (!checkoutId) return sendError(res, 400, 'checkoutId is required.');

    const uid = decodedToken.uid;
    const polar = getPolar();

    const checkout = await polar.checkouts.get({ id: checkoutId });
    if (!checkout) return sendError(res, 404, 'Checkout not found.');

    // Authorize: the checkout must belong to this user.
    const checkoutUid = String(checkout.metadata?.uid || '');
    const externalCustomerId = checkout.externalCustomerId || '';
    if (checkoutUid !== uid && externalCustomerId !== uid) {
      return sendError(res, 403, 'This checkout does not belong to the signed-in user.');
    }

    // Only act on succeeded checkouts. If still processing, the webhook will catch up.
    const checkoutStatus = String(checkout.status || '');
    if (checkoutStatus !== 'succeeded' && checkoutStatus !== 'confirmed') {
      return res.status(200).json({ status: 'pending', tierId: null, billing: null });
    }

    const tierId = String(checkout.metadata?.tierId || '');
    const billing = String(checkout.metadata?.billing || '');
    const customerId = checkout.customerId || '';
    const subscriptionId = checkout.subscriptionId || null;

    let subscriptionStatus = 'active';

    if (subscriptionId) {
      const subscription = await polar.subscriptions.get({ id: subscriptionId });
      if (subscription?.status) subscriptionStatus = subscription.status;
    }

    // Mirror the webhook's membership upsert (api/polar/webhook.js lines 47-56).
    if (tierId) {
      await getDb().from('memberships').upsert({
        user_id: uid,
        tier_id: tierId,
        billing,
        status: subscriptionStatus === 'canceled' ? 'canceled' : 'active',
        subscription_id: subscriptionId,
        customer_id: customerId,
        session_id: checkoutId,
        updated_at: Date.now(),
      });
    }

    // Mirror the webhook's polar_subscriptions upsert (lines 60-69).
    if (subscriptionId) {
      await getDb().from('polar_subscriptions').upsert({
        id: subscriptionId,
        uid,
        tier_id: tierId,
        billing,
        customer_id: customerId,
        status: subscriptionStatus === 'canceled' ? 'canceled' : 'active',
        order_id: null,
        updated_at: Date.now(),
      });
    }

    return res.status(200).json({ status: subscriptionStatus, tierId, billing });
  } catch (error) {
    console.error('polar verify-membership-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to verify membership.');
  }
}
