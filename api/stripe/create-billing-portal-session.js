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

    const { data: subs } = await getDb()
      .from('stripe_subscriptions')
      .select('customer_id')
      .eq('uid', decodedToken.uid)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (!subs || subs.length === 0) {
      return sendError(res, 404, 'No active Stripe subscription was found for this account.');
    }

    const customerId = subs[0].customer_id;
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
