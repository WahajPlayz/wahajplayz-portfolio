import admin from 'firebase-admin';
import { applyCors, handleOptions } from '../_lib/cors.js';
import { getAdminApp, getDb } from '../_lib/admin.js';
import { getStripe, convertToBaseCurrency } from '../_lib/stripe.js';
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

    console.log('[webhook] event received:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const kind = session.metadata?.kind;
      const uid = session.metadata?.uid || session.client_reference_id || '';

      console.log('[webhook] checkout.session.completed kind:', kind, 'session:', session.id);

      if (kind === 'donation') {
        const donorName = session.metadata?.username || session.customer_details?.name || 'Anonymous';
        const donorEmail = session.customer_details?.email || null;
        const donationMessage = session.metadata?.message || '';
        console.log('[webhook] processing donation from:', donorName, 'amount:', session.amount_total, session.currency, 'message:', donationMessage || '(none)');

        await recordTransaction(session, {
          kind: 'donation',
          message: donationMessage,
        });

        const amountGBP = await convertToBaseCurrency(session.amount_total || 0, session.currency || 'GBP');

        // Create donation conversation record
        await getDb().collection('donation_conversations').doc(session.id).set({
          transactionId: session.id,
          donorName,
          donorEmail,
          amountGBP,
          amountOriginal: session.amount_total || 0,
          currencyOriginal: (session.currency || 'GBP').toUpperCase(),
          message: donationMessage,
          createdAt: Date.now(),
          replied: false,
          lastReplyAt: null,
        });

        // Increment the first enabled goal — only if goals are already configured in Firestore
        const supportSnap = await getDb().doc('wahaj_data/support').get();
        const supportData = supportSnap.exists ? supportSnap.data() : null;
        let goals = null;
        if (Array.isArray(supportData?.goals) && supportData.goals.length > 0) {
          goals = [...supportData.goals];
        } else if (supportData?.goal) {
          goals = [{ id: 'goal-default', title: 'Goal', ...supportData.goal }];
        }
        if (goals) {
          const goalIdx = goals.findIndex(g => g.enabled);
          console.log('[webhook] goals found:', goals.length, 'enabled goal index:', goalIdx);
          if (goalIdx !== -1) {
            const prevRaised = goals[goalIdx].raised || 0;
            goals[goalIdx] = { ...goals[goalIdx], raised: prevRaised + amountGBP };
            console.log('[webhook] updating goal raised:', prevRaised, '->', goals[goalIdx].raised);
            await getDb().doc('wahaj_data/support').set({ goals }, { merge: true });
            console.log('[webhook] goal updated in Firestore');
          } else {
            console.log('[webhook] no enabled goal found — skipping goal update');
          }
        } else {
          console.log('[webhook] no goals configured in Firestore — skipping goal update');
        }
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
