import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken } from '../_lib/admin.js';
import { getPolar, getAppUrl } from '../_lib/polar.js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) return sendError(res, 401, 'You must be signed in.');

    const origin = getAppUrl();
    const session = await getPolar().customerSessions.create({
      externalCustomerId: decodedToken.uid,
      returnUrl: `${origin}/#/profile`,
    });

    return res.status(200).json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error('polar create-customer-portal-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create customer portal session.');
  }
}
