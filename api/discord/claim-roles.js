import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { assignMembershipRoles } from '../_lib/data.js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decoded = await verifyIdToken(req.headers.authorization || '');
    if (!decoded?.uid) {
      return sendError(res, 401, 'You must be signed in to claim Discord roles.');
    }

    const { data: linkRow } = await getDb()
      .from('discord_users')
      .select('discord_id')
      .eq('auth_user_id', decoded.uid)
      .limit(1)
      .maybeSingle();

    if (!linkRow?.discord_id) {
      return res.status(200).json({ linked: false, assigned: 0 });
    }

    const { data: rows } = await getDb()
      .from('memberships')
      .select('tier_id, billing, status')
      .eq('user_id', decoded.uid)
      .eq('status', 'active');

    const active = Array.isArray(rows) ? rows : [];
    let assigned = 0;
    for (const row of active) {
      const result = await assignMembershipRoles({
        uid: decoded.uid,
        tierId: row.tier_id,
        billing: row.billing,
      });
      if (result && result.succeeded) assigned += result.succeeded;
    }

    return res.status(200).json({ linked: true, memberships: active.length, assigned });
  } catch (error) {
    console.error('claim-roles failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to claim Discord roles.');
  }
}
