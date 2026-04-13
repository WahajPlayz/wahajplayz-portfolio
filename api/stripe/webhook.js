import { applyCors, handleOptions } from '../_lib/cors.js';
import { getDb } from '../_lib/admin.js';
import { getStripe, convertToBaseCurrency } from '../_lib/stripe.js';
import { readRawBody, sendError } from '../_lib/http.js';
import { getStoreProduct, recordTransaction, grantDigitalPurchase, recordPhysicalOrder } from '../_lib/data.js';

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
        console.log('[webhook] processing donation from:', donorName);

        await recordTransaction(session, { kind: 'donation', message: donationMessage });

        const amountGBP = await convertToBaseCurrency(session.amount_total || 0, session.currency || 'GBP');

        await getDb().from('donations').upsert({
          id: session.id,
          donor_name: donorName,
          donor_email: donorEmail,
          amount_gbp: amountGBP,
          amount_original: session.amount_total || 0,
          currency_original: (session.currency || 'GBP').toUpperCase(),
          message: donationMessage,
          created_at: new Date().toISOString(),
          replied: false,
        });

        const { data: configRow } = await getDb().from('support_config').select('goals').eq('id', 1).single();
        const goals = configRow?.goals ?? [];
        const goalIdx = goals.findIndex((g) => g.enabled);
        console.log('[webhook] goals found:', goals.length, 'enabled goal index:', goalIdx);
        if (goalIdx !== -1) {
          const prevRaised = goals[goalIdx].raised || 0;
          goals[goalIdx] = { ...goals[goalIdx], raised: prevRaised + amountGBP };
          await getDb().from('support_config').update({ goals }).eq('id', 1);
          console.log('[webhook] goal updated raised:', prevRaised, '->', goals[goalIdx].raised);
        } else {
          console.log('[webhook] no enabled goal found — skipping goal update');
        }
      }

      if (kind === 'store') {
        const parsedProductIds = (() => {
          try { return JSON.parse(session.metadata?.productIds || '[]'); } catch { return []; }
        })();
        const productIds = Array.isArray(parsedProductIds) && parsedProductIds.length > 0
          ? parsedProductIds
          : (session.metadata?.productId ? [session.metadata.productId] : []);

        await recordTransaction(session, { kind: 'store', uid, product_ids: productIds });

        if (uid) {
          for (const productId of productIds) {
            const product = await getStoreProduct(productId);
            if (product?.type === 'digital') {
              await grantDigitalPurchase(uid, product, session.id);
            }
          }
        }

        if (session.metadata?.hasPhysical === 'true') {
          const productNames = (() => { try { return JSON.parse(session.metadata?.productNames || '[]'); } catch { return []; } })();
          const variantLabels = (() => { try { return JSON.parse(session.metadata?.variantLabels || '[]'); } catch { return []; } })();
          const quantities = (() => { try { return JSON.parse(session.metadata?.quantities || '[]'); } catch { return []; } })();
          await recordPhysicalOrder(session, { product_ids: productIds, product_names: productNames, variant_labels: variantLabels, quantities });
        }
      }

      if (kind === 'commission') {
        const service = session.metadata?.service || '';
        const description = session.metadata?.description || '';
        const contact = session.metadata?.contact || '';
        const { convertToBaseCurrency } = await import('../_lib/stripe.js');
        const amountGBP = await convertToBaseCurrency(session.amount_total || 0, session.currency || 'GBP');

        await getDb().from('commission_requests').insert({
          service,
          description,
          contact,
          status: 'paid',
          stripe_session_id: session.id,
          amount_gbp: amountGBP,
          created_at: new Date().toISOString(),
          read: false,
        });
      }

      if (kind === 'membership') {
        const tierId = session.metadata?.tierId || '';
        const billing = session.metadata?.billing || '';
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || '';

        await recordTransaction(session, {
          kind: 'membership',
          uid,
          tier_id: tierId,
          billing,
          customer_id: customerId,
          subscription_id: session.subscription || null,
        });

        if (uid && tierId) {
          await getDb().from('memberships').upsert({
            user_id: uid,
            tier_id: tierId,
            billing,
            status: session.mode === 'subscription' || session.payment_status === 'paid' ? 'active' : session.payment_status,
            session_id: session.id,
            customer_id: customerId,
            subscription_id: session.subscription || null,
            updated_at: Date.now(),
          });
        }

        if (typeof session.subscription === 'string') {
          await getDb().from('stripe_subscriptions').upsert({
            id: session.subscription,
            uid,
            tier_id: tierId,
            billing,
            customer_id: customerId,
            status: 'active',
            session_id: session.id,
            updated_at: Date.now(),
          });
        }
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;

      if (typeof subscriptionId === 'string') {
        const { data: sub } = await getDb().from('stripe_subscriptions').select('*').eq('id', subscriptionId).single();
        if (sub) {
          const invoiceId = typeof invoice.id === 'string' && invoice.id ? invoice.id : 'invoice-fallback';
          await getDb().from('transactions').upsert({
            id: invoiceId,
            kind: 'membership-renewal',
            uid: sub.uid || '',
            tier_id: sub.tier_id || '',
            billing: sub.billing || '',
            currency: invoice.currency?.toUpperCase() || '',
            amount_total: invoice.amount_paid || 0,
            status: 'paid',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await getDb().from('stripe_subscriptions').update({
        status: 'canceled',
        updated_at: Date.now(),
      }).eq('id', subscription.id);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe webhook failed', error);
    return sendError(res, 400, error instanceof Error ? error.message : 'Webhook processing failed.');
  }
}
