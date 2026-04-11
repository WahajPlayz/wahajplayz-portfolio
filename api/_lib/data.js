import { getDb } from './admin.js';

export const getStoreProduct = async (productId) => {
  const { data } = await getDb().from('store_config').select('products').eq('id', 1).single();
  return (data?.products ?? []).find((p) => p.id === productId) ?? null;
};

export const getSupportConfig = async () => {
  const { data } = await getDb().from('support_config').select('*').eq('id', 1).single();
  if (!data) return {};
  return {
    goals: data.goals ?? [],
    membership: data.membership ?? {},
    donation: data.donation ?? {},
    posts: data.posts ?? [],
    membershipPage: data.membership_page ?? {},
    donatePage: data.donate_page ?? {},
    adminPermissions: data.admin_permissions ?? {},
  };
};

export const getMembershipTier = async (tierId) => {
  const config = await getSupportConfig();
  return config?.membership?.tiers?.find((tier) => tier.id === tierId) ?? null;
};

export const recordTransaction = async (session, extra = {}) => {
  await getDb().from('transactions').upsert({
    id: session.id,
    status: session.payment_status || 'unpaid',
    amount_total: session.amount_total || 0,
    currency: session.currency?.toUpperCase() || '',
    customer_email: session.customer_details?.email || null,
    created_at: new Date().toISOString(),
    ...extra,
  });
};

export const grantDigitalPurchase = async (uid, product, sessionId) => {
  await getDb().from('digital_purchases').upsert({
    user_id: uid,
    product_id: product.id,
    product_name: product.name,
    digital_file_name: product.digitalFileName || '',
    session_id: sessionId,
    status: 'paid',
    granted_at: Date.now(),
    updated_at: Date.now(),
  });
};
