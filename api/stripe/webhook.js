import admin from 'firebase-admin';
import { applyCors, handleOptions } from '../_lib/cors.js';
import { getAdminApp, getDb } from '../_lib/admin.js';
import { getStripe } from '../_lib/stripe.js';
import { readRawBody, sendError } from '../_lib/http.js';
import { getStoreProduct, recordTransaction, grantDigitalPurchase } from '../_lib/data.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    getAdminApp();
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return sendError(res, 400, 'Missing Stripe signature.');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return sendError(res, 500, 'Missing STRIPE_WEBHOOK_SECRET.');
    }

    const payload = await readRawBody(req);
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const kind = session.metadata?.kind;
      const uid = session.metadata?.uid || session.client_reference_id || '';

      if (kind === 'donation') {
        await recordTransaction(session, {
          kind: 'donation',
          message: session.metadata?.message || '',
        });
      }

      if (kind === 'store') {
        const parsedProductIds = (() => {
          try {
            return JSON.parse(session.metadata?.productIds || '[]');
          } catch {
            return [];
          }
        })();
        const productIds = Array.isArray(parsedProductIds) && parsedProductIds.length > 0
          ? parsedProductIds
          : (session.metadata?.productId ? [session.metadata.productId] : []);

        await recordTransaction(session, {
          kind: 'store',
          uid,
          productIds,
        });

        if (uid) {
          for (const productId of productIds) {
            const product = await getStoreProduct(productId);
            if (product?.type === 'digital') {
              await grantDigitalPurchase(uid, product, session.id);
            }
          }
        }
      }

      if (kind === 'membership') {
        const tierId = session.metadata?.tierId || '';
        const billing = session.metadata?.billing || '';
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';
        await recordTransaction(session, {
          kind: 'membership',
          uid,
          tierId,
          billing,
          customerId,
          subscriptionId: session.subscription || null,
        });

        if (uid && tierId) {
          await getDb().doc(`users/${uid}/memberships/${tierId}`).set({
            tierId,
            billing,
            status: session.mode === 'subscription' || session.payment_status === 'paid' ? 'active' : session.payment_status,
            sessionId: session.id,
            customerId,
            subscriptionId: session.subscription || null,
            updatedAt: Date.now(),
          }, { merge: true });
        }

        if (typeof session.subscription === 'string') {
          await getDb().collection('stripe_subscriptions').doc(session.subscription).set({
            uid,
            tierId,
            billing,
            customerId,
            status: 'active',
            sessionId: session.id,
            updatedAt: Date.now(),
          }, { merge: true });
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;

      if (typeof subscriptionId === 'string') {
        const subSnap = await getDb().collection('stripe_subscriptions').doc(subscriptionId).get();
        if (subSnap.exists) {
          const data = subSnap.data() || {};
          const invoiceId = typeof invoice.id === 'string' && invoice.id ? invoice.id : 'invoice-fallback';
          await getDb().collection('transactions').doc(invoiceId).set({
            id: invoiceId,
            kind: 'membership-renewal',
            uid: data.uid || '',
            tierId: data.tierId || '',
            billing: data.billing || '',
            currency: invoice.currency?.toUpperCase() || '',
            amountTotal: invoice.amount_paid || 0,
            status: 'paid',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await getDb().collection('stripe_subscriptions').doc(subscription.id).set({
        status: 'canceled',
        updatedAt: Date.now(),
      }, { merge: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe webhook failed', error);
    return sendError(res, 400, error instanceof Error ? error.message : 'Webhook processing failed.');
  }
}
