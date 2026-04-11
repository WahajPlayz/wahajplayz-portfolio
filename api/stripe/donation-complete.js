import { applyCors, handleOptions } from '../_lib/cors.js';
import { getStripe, convertToBaseCurrency } from '../_lib/stripe.js';
import { getAdminApp, getDb } from '../_lib/admin.js';
import { sendError, sendJson, readJson } from '../_lib/http.js';
import { recordTransaction, getSupportConfig } from '../_lib/data.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    getAdminApp();
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

    const db = getDb();
    const donorName = session.customer_details?.name || 'Anonymous';
    const donorEmail = session.customer_details?.email || null;
    const donationMessage = session.metadata?.message || '';
    const amountGBP = await convertToBaseCurrency(session.amount_total || 0, session.currency || 'GBP');

    // Idempotency: if the webhook already processed this session, skip writes
    const docRef = db.collection('donation_conversations').doc(session.id);
    const existing = await docRef.get();

    if (!existing.exists) {
      await recordTransaction(session, { kind: 'donation', message: donationMessage });

      await docRef.set({
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

      // Update the first enabled goal
      const supportData = await getSupportConfig();
      let goals;
      if (Array.isArray(supportData?.goals) && supportData.goals.length > 0) {
        goals = [...supportData.goals];
      } else if (supportData?.goal) {
        goals = [{ id: 'goal-default', title: 'Goal', ...supportData.goal }];
      } else {
        goals = [{
          id: 'goal-default',
          title: 'Monthly Goal',
          enabled: true,
          type: 'monthly',
          currency: '£',
          currencyCode: 'GBP',
          target: 500,
          raised: 0,
          description: 'Help keep this going.',
          milestones: [],
        }];
      }
      const goalIdx = goals.findIndex(g => g.enabled);
      if (goalIdx !== -1) {
        goals[goalIdx] = { ...goals[goalIdx], raised: (goals[goalIdx].raised || 0) + amountGBP };
        await db.doc('wahaj_data/support').set({ goals }, { merge: true });
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
