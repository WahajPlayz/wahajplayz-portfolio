import { supabase, getAuthToken } from '@/lib/supabase';

const apiBase = (import.meta.env.VITE_STRIPE_API_BASE || '').replace(/\/$/, '');

const buildUrl = (path: string) => `${apiBase}${path}`;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const waitForSignedInSession = async (timeoutMs = 5000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && !session.user.is_anonymous) return session;
    await sleep(150);
  }
  return null;
};

const getAuthHeader = async (forceRefresh = false) => {
  const session = await waitForSignedInSession(5000);
  if (!session) return {};
  try {
    const token = await getAuthToken(forceRefresh);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    const token = await getAuthToken(true);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

const isAuthError = (status: number, message: string) =>
  status === 401 || status === 403 ||
  message.includes('UNAUTHENTICATED') ||
  message.includes('invalid authentication credentials') ||
  message.includes('You must be signed in');

const postJson = async <TResponse>(path: string, payload: unknown, requiresAuth = false): Promise<TResponse> => {
  const attempts = requiresAuth ? 3 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (requiresAuth) Object.assign(headers, await getAuthHeader(attempt > 0));
    const response = await fetch(buildUrl(path), { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data as TResponse;
    const message = typeof data?.error === 'string' ? data.error : 'Stripe request failed.';
    if (requiresAuth && isAuthError(response.status, message) && attempt < attempts - 1) {
      await waitForSignedInSession(7000);
      await sleep(250 * (attempt + 1));
      continue;
    }
    if (isAuthError(response.status, message)) {
      throw new Error('Your sign-in session is still finishing. Please try again in a moment.');
    }
    throw new Error(message);
  }
  throw new Error('Your sign-in session is still finishing. Please try again in a moment.');
};

const redirectToStripe = (url?: string) => {
  if (!url) throw new Error('Checkout session URL was not returned.');
  window.location.assign(url);
};

export const startStoreCheckout = async (
  items: { productId: string; quantity: number; variantLabel?: string }[],
  currency: string,
) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-store-session', { items, currency }, true);
  redirectToStripe(data.url);
};

export const startDonationCheckout = async (amount: number, currency: string, message: string, username?: string) => {
  const returnOrigin = window.location.origin;
  const data = await postJson<{ url?: string }>('/api/stripe/create-donation-session', { amount, currency, message, username, returnOrigin });
  redirectToStripe(data.url);
};

export const startCommissionCheckout = async (
  serviceName: string,
  basePrice: number,
  currency: string,
  description: string,
  contact: string,
) => {
  const returnOrigin = window.location.origin;
  const data = await postJson<{ url?: string }>('/api/stripe/create-commission-session', {
    serviceName, basePrice, currency, description, contact, returnOrigin,
  });
  redirectToStripe(data.url);
};

export const startMembershipCheckout = async (tierId: string, billing: 'monthly' | 'yearly' | 'lifetime', currency: string) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-membership-session', { tierId, billing, currency }, true);
  redirectToStripe(data.url);
};

export const openMembershipBillingPortal = async () => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-billing-portal-session', {}, true);
  redirectToStripe(data.url);
};

export const verifyDigitalCheckout = async (sessionId: string) => {
  return postJson<{ status: 'pending' | 'paid'; productId?: string; granted?: boolean }>(
    '/api/stripe/verify-digital-session', { sessionId }, true
  );
};

export const fetchDigitalDownloadUrl = async (productId: string) => {
  return postJson<{ url: string }>('/api/stripe/download-url', { productId }, true);
};

export const fetchOrderSummary = async (sessionId: string) => {
  return postJson<{
    orderId: string;
    customerName: string;
    customerEmail: string;
    shippingName: string;
    shippingAddress: { line1: string; line2: string; city: string; state: string; postalCode: string; country: string } | null;
    products: { id: string; name: string; variant: string; quantity: number }[];
    amountTotal: number;
    currency: string;
    createdAt: string;
  }>('/api/stripe/order-summary', { sessionId });
};
