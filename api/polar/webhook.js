import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { applyCors, handleOptions } from '../_lib/cors.js';
import { getDb } from '../_lib/admin.js';
import { getStoreProduct, grantDigitalPurchase, assignMembershipRoles, removeMembershipRoles } from '../_lib/data.js';
import { readRawBody, sendError } from '../_lib/http.js';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) return sendError(res, 500, 'Missing POLAR_WEBHOOK_SECRET.');

  let event;
  try {
    const payload = await readRawBody(req);
    event = validateEvent(payload, req.headers, webhookSecret);
  } catch (err) {
    if (err instanceof WebhookVerificationError) return sendError(res, 403, 'Invalid webhook signature.');
    console.error('[polar-webhook] parse error', err);
    return sendError(res, 400, 'Webhook parse error.');
  }

  console.log('[polar-webhook] event:', event.type);

  try {
    // ── ORDER PAID ───────────────────────────────────────────────────────────
    if (event.type === 'order.paid') {
      const order = event.data;
      const meta = order.metadata || {};
      const kind = meta.kind;
      const uid = String(meta.uid || '');

      if (kind === 'membership') {
        const tierId = String(meta.tierId || '');
        const billing = String(meta.billing || '');
        const customerId = order.customerId || '';
        const subscriptionId = order.subscriptionId || null;
        const isRenewal = order.billingReason === 'subscription_cycle';

        if (uid && tierId) {
          await getDb().from('memberships').upsert({
            user_id: uid,
            tier_id: tierId,
            billing,
            status: 'active',
            subscription_id: subscriptionId,
            customer_id: customerId,
            session_id: order.checkoutId || order.id,
            updated_at: Date.now(),
          });
        }

        if (subscriptionId) {
          await getDb().from('polar_subscriptions').upsert({
            id: subscriptionId,
            uid,
            tier_id: tierId,
            billing,
            customer_id: customerId,
            status: 'active',
            order_id: order.id,
            updated_at: Date.now(),
          });
        }

        await getDb().from('transactions').upsert({
          id: order.id,
          kind: isRenewal ? 'membership-renewal' : 'membership',
          uid,
          tier_id: tierId,
          billing,
          customer_id: customerId,
          subscription_id: subscriptionId,
          currency: (order.currency || 'GBP').toUpperCase(),
          amount_total: order.totalAmount || 0,
          status: 'paid',
          created_at: new Date().toISOString(),
        });

        if (uid && tierId) {
          await assignMembershipRoles({ uid, tierId, billing });
        }
      }

      if (kind === 'store') {
        const productIds = (() => {
          try { return JSON.parse(String(meta.productIds || '[]')); } catch { return []; }
        })();

        if (uid && productIds.length > 0) {
          for (const productId of productIds) {
            const product = await getStoreProduct(productId);
            if (product?.type === 'digital') {
              await grantDigitalPurchase(uid, product, order.id);
            }
          }
        }

        await getDb().from('transactions').upsert({
          id: order.id,
          kind: 'store',
          uid,
          currency: (order.currency || 'GBP').toUpperCase(),
          amount_total: order.totalAmount || 0,
          status: 'paid',
          created_at: new Date().toISOString(),
        });
      }

      if (kind === 'commission') {
        const amountGBP = (order.totalAmount || 0) / 100;
        await getDb().from('commission_requests').insert({
          service: String(meta.service || ''),
          description: String(meta.description || ''),
          contact: String(meta.contact || ''),
          status: 'paid',
          polar_order_id: order.id,
          amount_gbp: amountGBP,
          created_at: new Date().toISOString(),
          read: false,
        });
      }
    }

    // ── SUBSCRIPTION REVOKED (access ended) ─────────────────────────────────
    if (event.type === 'subscription.revoked') {
      const sub = event.data;
      await getDb().from('polar_subscriptions').update({
        status: 'canceled',
        updated_at: Date.now(),
      }).eq('id', sub.id);

      const { data: polarSub } = await getDb()
        .from('polar_subscriptions')
        .select('uid, tier_id')
        .eq('id', sub.id)
        .single();

      if (polarSub?.uid) {
        await getDb().from('memberships').update({
          status: 'canceled',
          updated_at: Date.now(),
        }).eq('user_id', polarSub.uid).eq('tier_id', polarSub.tier_id);

        await removeMembershipRoles({ uid: polarSub.uid, tierId: polarSub.tier_id });
      }
    }

    // ── SUBSCRIPTION CANCELED (user requested, billing continues until end) ─
    if (event.type === 'subscription.canceled') {
      const sub = event.data;
      await getDb().from('polar_subscriptions').update({
        status: 'canceled',
        updated_at: Date.now(),
      }).eq('id', sub.id);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[polar-webhook] processing error', err);
    return sendError(res, 500, 'Webhook processing failed.');
  }
}
