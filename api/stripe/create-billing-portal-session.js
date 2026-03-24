import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getStripe, getAppUrl } from '../_lib/stripe.js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) {
      return sendError(res, 401, 'You must be signed in to manage your membership.');
    }

    const snapshot = await getDb()
      .collection('stripe_subscriptions')
      .where('uid', '==', decodedToken.uid)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return sendError(res, 404, 'No active Stripe subscription was found for this account.');
    }

    const data = snapshot.docs[0].data();
    const customerId = data.customerId;
    if (!customerId) {
      return sendError(res, 400, 'This membership does not have a Stripe customer attached yet.');
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/#/profile`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-billing-portal-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create billing portal session.');
  }
}
