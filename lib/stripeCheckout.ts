import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
const apiBase = (import.meta.env.VITE_STRIPE_API_BASE || '').replace(/\/$/, '');

const buildUrl = (path: string) => `${apiBase}${path}`;

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isInteractiveUser = (user: User | null | undefined): user is User => !!user && !user.isAnonymous;

export const waitForSignedInUser = async (timeoutMs = 5000, preferredUser?: User | null) => {
  const startedAt = Date.now();

  if (isInteractiveUser(preferredUser)) {
    return preferredUser;
  }

  if (typeof (auth as typeof auth & { authStateReady?: () => Promise<void> }).authStateReady === 'function') {
    await (auth as typeof auth & { authStateReady: () => Promise<void> }).authStateReady();
  }

  while (Date.now() - startedAt < timeoutMs) {
    const user = auth.currentUser;
    if (isInteractiveUser(user)) return user;
    await sleep(150);
  }

  return isInteractiveUser(auth.currentUser) ? auth.currentUser : null;
};

const getAuthHeader = async (forceRefresh = false, preferredUser?: User | null) => {
  const user = await waitForSignedInUser(5000, preferredUser);
  if (!user) return {};

  try {
    const token = await user.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${token}` };
  } catch {
    const freshToken = await user.getIdToken(true);
    return { Authorization: `Bearer ${freshToken}` };
  }
};

const isAuthError = (status: number, message: string) =>
  status === 401 ||
  status === 403 ||
  message.includes('UNAUTHENTICATED') ||
  message.includes('invalid authentication credentials') ||
  message.includes('You must be signed in');

const postJson = async <TResponse>(path: string, payload: unknown, requiresAuth = false, preferredUser?: User | null): Promise<TResponse> => {
  const attempts = requiresAuth ? 3 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      Object.assign(headers, await getAuthHeader(attempt > 0, preferredUser));
    }

    const response = await fetch(buildUrl(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return data as TResponse;
    }

    const message = typeof data?.error === 'string' ? data.error : 'Stripe request failed.';
    if (requiresAuth && isAuthError(response.status, message) && attempt < attempts - 1) {
      await waitForSignedInUser(7000, preferredUser);
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
  user?: User | null
) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-store-session', { items, currency }, true, user);
  redirectToStripe(data.url);
};

export const startDonationCheckout = async (amount: number, currency: string, message: string, username?: string) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-donation-session', { amount, currency, message, username });
  redirectToStripe(data.url);
};

export const startMembershipCheckout = async (tierId: string, billing: 'monthly' | 'yearly' | 'lifetime', currency: string, user?: User | null) => {
  const data = await postJson<{ url?: string }>('/api/stripe/create-membership-session', { tierId, billing, currency }, true, user);
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
