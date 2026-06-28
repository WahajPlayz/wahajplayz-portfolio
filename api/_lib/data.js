import { getDb } from './admin.js';
import { assignRoles, removeRoles } from './discordBot.js';

export const getStoreProduct = async (productId) => {
  const { data } = await getDb().from('store_config').select('products').eq('id', 1).single();
  return (data?.products ?? []).find((p) => p.id === productId) ?? null;
};

// Persist a Polar product ID back to a store product (after auto-creating
// the product on first checkout).
export const saveStoreProductPolarId = async (productId, polarProductId) => {
  const { data } = await getDb().from('store_config').select('products').eq('id', 1).single();
  const products = Array.isArray(data?.products) ? data.products : [];
  const updatedProducts = products.map((p) =>
    p.id === productId ? { ...p, polarProductId } : p
  );
  await getDb()
    .from('store_config')
    .update({ products: updatedProducts })
    .eq('id', 1);
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

// Persist a Polar product ID back to a membership tier (e.g. after auto-creating
// the product on first checkout). field is one of polarMonthlyId/polarYearlyId/polarLifetimeId.
export const saveMembershipTierPolarId = async (tierId, field, polarProductId) => {
  const { data } = await getDb().from('support_config').select('membership').eq('id', 1).single();
  const membership = data?.membership ?? {};
  const tiers = Array.isArray(membership.tiers) ? membership.tiers : [];
  const updatedTiers = tiers.map((tier) =>
    tier.id === tierId ? { ...tier, [field]: polarProductId } : tier
  );
  await getDb()
    .from('support_config')
    .update({ membership: { ...membership, tiers: updatedTiers } })
    .eq('id', 1);
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

export const recordPhysicalOrder = async (session, extra = {}) => {
  const shipping = session.shipping_details?.address ?? {};
  await getDb().from('physical_orders').upsert({
    id: session.id,
    uid: session.metadata?.uid || session.client_reference_id || '',
    customer_name: session.customer_details?.name || '',
    customer_email: session.customer_details?.email || '',
    shipping_name: session.shipping_details?.name || '',
    shipping_line1: shipping.line1 || '',
    shipping_line2: shipping.line2 || '',
    shipping_city: shipping.city || '',
    shipping_state: shipping.state || '',
    shipping_postal_code: shipping.postal_code || '',
    shipping_country: shipping.country || '',
    amount_total: session.amount_total || 0,
    currency: session.currency?.toUpperCase() || '',
    status: 'pending',
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

const getDiscordIdForUid = async (uid) => {
  if (!uid) return null;
  const { data } = await getDb()
    .from('discord_users')
    .select('discord_id')
    .eq('auth_user_id', uid)
    .limit(1)
    .maybeSingle();
  return data?.discord_id ?? null;
};

const rolesForTier = (tier, billing) => {
  const base = Array.isArray(tier?.discordRoleIds) ? tier.discordRoleIds : [];
  const lifetime = Array.isArray(tier?.lifetimeDiscordRoleIds) ? tier.lifetimeDiscordRoleIds : [];
  return billing === 'lifetime' ? [...base, ...lifetime] : base;
};

/**
 * Assigns the buyer's tier roles on the configured Discord guild.
 * Silently no-ops if the user hasn't linked Discord yet (claim flow handles
 * it later) or if Discord env vars are missing.
 */
export const assignMembershipRoles = async ({ uid, tierId, billing }) => {
  try {
    if (!uid || !tierId) return { skipped: true };
    const discordId = await getDiscordIdForUid(uid);
    if (!discordId) return { skipped: true, reason: 'no-discord-link' };
    const tier = await getMembershipTier(tierId);
    if (!tier) return { skipped: true, reason: 'unknown-tier' };
    const roles = rolesForTier(tier, billing);
    if (roles.length === 0) return { skipped: true, reason: 'no-role-ids' };
    return await assignRoles(discordId, roles);
  } catch (err) {
    console.error('[assignMembershipRoles] failed', err);
    return { ok: false };
  }
};

/**
 * Removes only the renewable (non-lifetime) roles for a tier. Lifetime roles
 * stay forever once granted.
 */
export const removeMembershipRoles = async ({ uid, tierId }) => {
  try {
    if (!uid || !tierId) return { skipped: true };
    const discordId = await getDiscordIdForUid(uid);
    if (!discordId) return { skipped: true, reason: 'no-discord-link' };
    const tier = await getMembershipTier(tierId);
    if (!tier) return { skipped: true, reason: 'unknown-tier' };
    const roles = Array.isArray(tier.discordRoleIds) ? tier.discordRoleIds : [];
    if (roles.length === 0) return { skipped: true, reason: 'no-role-ids' };
    return await removeRoles(discordId, roles);
  } catch (err) {
    console.error('[removeMembershipRoles] failed', err);
    return { ok: false };
  }
};
