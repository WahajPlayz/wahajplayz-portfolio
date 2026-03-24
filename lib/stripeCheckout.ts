import { auth } from '@/lib/firebase';
const apiBase = (import.meta.env.VITE_STRIPE_API_BASE || '').replace(/\/$/, '');

const buildUrl = (path: string) => `${apiBase}${path}`;

const waitForSignedInUser = async (timeoutMs = 5000) => {
  const startedAt = Date.now();

  if (typeof (auth as typeof auth & { authStateReady?: () => Promise<void> }).authStateReady === 'function') {
    await (auth as typeof auth & { authStateReady: () => Promise<void> }).authStateReady();
  }

  while (Date.now() - startedAt < timeoutMs) {
    const user = auth.currentUser;
    if (user && !user.isAnonymous) return user;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  return auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null;
};

const getAuthHeader = async () => {
  const user = await waitForSignedInUser();
  if (!user) return {};

  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    const freshToken = await user.getIdToken(true);
    return { Authorization: `Bearer ${freshToken}` };
  }
};

const postJson = async <TResponse>(path: string, payload: unknown, requiresAuth = false): Promise<TResponse> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    Object.assign(headers, await getAuthHeader());
  }

  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Stripe request failed.';
    if (message.includes('UNAUTHENTICATED') || message.includes('invalid authentication credentials')) {
      throw new Error('Your sign-in session was not ready yet. Please try once more.');
    }
    throw new Error(message);
  }

  return data as TResponse;
};

const redirectToStripe = (url?: string) => {
  if (!url) throw new Error('Checkout session URL was not returned.');
  window.location.assign(url);
};

export const startStoreCheckout = async (
  items: { productId: string; quantity: number; variantLabel?: string }[],
  currency: string
) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-store-session', { items, currency }, true);
  redirectToStripe(data.url);
};

export const startDonationCheckout = async (amount: number, currency: string, message: string) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-donation-session', { amount, currency, message });
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
    '/api/stripe/verify-digital-session',
    { sessionId },
    true
  );
};

export const fetchDigitalDownloadUrl = async (productId: string) => {
  return postJson<{ url: string }>('/api/stripe/download-url', { productId }, true);
};
