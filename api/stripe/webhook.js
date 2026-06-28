import { applyCors, handleOptions } from '../_lib/cors.js';
import { getDb } from '../_lib/admin.js';
import { getStripe, convertToBaseCurrency } from '../_lib/stripe.js';
import { readRawBody, sendError } from '../_lib/http.js';
import { recordTransaction } from '../_lib/data.js';

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

      // store, commission, and membership are now handled by the Polar webhook
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe webhook failed', error);
    return sendError(res, 400, error instanceof Error ? error.message : 'Webhook processing failed.');
  }
}
