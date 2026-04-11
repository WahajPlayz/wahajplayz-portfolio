import { applyCors, handleOptions } from '../_lib/cors.js';
import { getStripe, convertToBaseCurrency } from '../_lib/stripe.js';
import { getDb } from '../_lib/admin.js';
import { sendError, sendJson, readJson } from '../_lib/http.js';
import { recordTransaction } from '../_lib/data.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const { sessionId } = await readJson(req);
    if (!sessionId || typeof sessionId !== 'string') {
      return sendError(res, 400, 'sessionId is required.');
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return sendError(res, 400, 'Payment not completed.');
    }
    if (session.metadata?.kind !== 'donation') {
      return sendError(res, 400, 'Not a donation session.');
    }

    const donorName = session.metadata?.username || session.customer_details?.name || 'Anonymous';
    const donorEmail = session.customer_details?.email || null;
    const donationMessage = session.metadata?.message || '';
    const amountGBP = await convertToBaseCurrency(session.amount_total || 0, session.currency || 'GBP');

    // Idempotency: if the webhook already processed this session, skip writes
    const { data: existing } = await getDb().from('donations').select('id').eq('id', session.id).single();

    if (!existing) {
      await recordTransaction(session, { kind: 'donation', message: donationMessage });

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
      if (goalIdx !== -1) {
        goals[goalIdx] = { ...goals[goalIdx], raised: (goals[goalIdx].raised || 0) + amountGBP };
        await getDb().from('support_config').update({ goals }).eq('id', 1);
        console.log('[donation-complete] goal updated, raised now:', goals[goalIdx].raised);
      } else {
        console.log('[donation-complete] no enabled goal found');
      }
    }

    return sendJson(res, 200, {
      donorName,
      amountGBP,
      amountOriginal: session.amount_total || 0,
      currencyOriginal: (session.currency || 'GBP').toUpperCase(),
      message: donationMessage,
    });
  } catch (error) {
    console.error('donation-complete failed:', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to process donation.');
  }
}
