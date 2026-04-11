import { getDb } from './admin.js';

export const getStoreProduct = async (productId) => {
  const snap = await getDb().doc('wahaj_data/store').get();
  if (!snap.exists) return null;
  const data = snap.data();
  return data?.products?.find((product) => product.id === productId) || null;
};

export const getSupportConfig = async () => {
  const snap = await getDb().doc('wahaj_data/support').get();
  return snap.exists ? snap.data() : {};
};

export const getMembershipTier = async (tierId) => {
  const config = await getSupportConfig();
  return config?.membership?.tiers?.find((tier) => tier.id === tierId) || null;
};

export const recordTransaction = async (session, extra = {}) => {
  await getDb().collection('transactions').doc(session.id).set({
    id: session.id,
    status: session.payment_status || 'unpaid',
    amountTotal: session.amount_total || 0,
    currency: session.currency?.toUpperCase() || '',
    customerEmail: session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    createdAt: Date.now(),
    ...extra,
  }, { merge: true });
};

export const grantDigitalPurchase = async (uid, product, sessionId) => {
  await getDb().doc(`users/${uid}/digitalPurchases/${product.id}`).set({
    productId: product.id,
    productName: product.name,
    digitalFileName: product.digitalFileName || '',
    sessionId,
    status: 'paid',
    grantedAt: Date.now(),
  }, { merge: true });
};
