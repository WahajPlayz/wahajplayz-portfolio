import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';

admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const appUrl = defineString('APP_URL', { default: 'https://www.wahajplayz.org' });

const BASE_CURRENCY = 'GBP';
const SUPPORTED_CURRENCIES = new Set([
  'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
  'NZD', 'SGD', 'HKD', 'MXN', 'BRL', 'INR', 'ZAR', 'PLN', 'CZK', 'RON',
]);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY']);

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'digital' | 'physical';
  digitalFilePath?: string;
  digitalFileUrl?: string;
  digitalFileName?: string;
  enabled: boolean;
  stock?: number | null;
};

type MembershipTier = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  lifetimePrice: number;
  lifetimeEnabled: boolean;
};

type SupportConfig = {
  membership?: {
    tiers?: MembershipTier[];
  };
};

type Billing = 'monthly' | 'yearly' | 'lifetime';

let exchangeRateCache: { base: string; fetchedAt: number; rates: Record<string, number> } | null = null;

const getStripe = () => new Stripe(stripeSecretKey.value(), { apiVersion: '2025-08-27.basil' });

const normalizeCurrency = (currency?: unknown) => {
  const code = String(currency ?? BASE_CURRENCY).toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : BASE_CURRENCY;
};

const roundMajorAmount = (amount: number, currency: string) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amount);
  return Math.round(amount * 100) / 100;
};

const toMinorUnits = (amount: number, currency: string) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amount);
  return Math.round(amount * 100);
};

const getExchangeRates = async (base = BASE_CURRENCY) => {
  const now = Date.now();
  if (exchangeRateCache && exchangeRateCache.base === base && now - exchangeRateCache.fetchedAt < 1000 * 60 * 30) {
    return exchangeRateCache.rates;
  }

  const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!response.ok) {
    throw new HttpsError('internal', 'Failed to fetch exchange rates.');
  }

  const data = await response.json() as { rates?: Record<string, number> };
  if (!data.rates) {
    throw new HttpsError('internal', 'Exchange rate response was invalid.');
  }

  exchangeRateCache = {
    base,
    fetchedAt: now,
    rates: data.rates,
  };

  return data.rates;
};

const convertFromBaseCurrency = async (amount: number, currency: string) => {
  if (currency === BASE_CURRENCY) return roundMajorAmount(amount, currency);
  const rates = await getExchangeRates(BASE_CURRENCY);
  const rate = rates[currency];
  if (!rate) {
    throw new HttpsError('failed-precondition', `Currency ${currency} is not currently available.`);
  }
  return roundMajorAmount(amount * rate, currency);
};

const buildPriceData = async (options: {
  amountInBaseCurrency: number;
  currency: string;
  name: string;
  description: string;
  recurring?: { interval: 'month' | 'year' };
}) => {
  const amount = await convertFromBaseCurrency(options.amountInBaseCurrency, options.currency);
  return {
    currency: options.currency.toLowerCase(),
    unit_amount: toMinorUnits(amount, options.currency),
    recurring: options.recurring,
    product_data: {
      name: options.name,
      description: options.description,
    },
  };
};

const getStoreProduct = async (productId: string): Promise<StoreProduct | null> => {
  const snap = await db.doc('wahaj_data/store').get();
  if (!snap.exists) return null;
  const data = snap.data() as { products?: StoreProduct[] };
  return data.products?.find(product => product.id === productId) ?? null;
};

const getSupportConfig = async (): Promise<SupportConfig> => {
  const snap = await db.doc('wahaj_data/support').get();
  if (!snap.exists) return {};
  return snap.data() as SupportConfig;
};

const getMembershipTier = async (tierId: string) => {
  const config = await getSupportConfig();
  return config.membership?.tiers?.find(tier => tier.id === tierId) ?? null;
};

const recordTransaction = async (session: Stripe.Checkout.Session, extra: Record<string, unknown>) => {
  await db.collection('transactions').doc(session.id).set({
    id: session.id,
    status: session.payment_status,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency?.toUpperCase() ?? '',
    customerEmail: session.customer_details?.email ?? null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  }, { merge: true });
};

const grantDigitalPurchase = async (uid: string, product: StoreProduct, sessionId: string) => {
  const purchaseRef = db.doc(`users/${uid}/digitalPurchases/${product.id}`);
  await purchaseRef.set({
    productId: product.id,
    productName: product.name,
    digitalFileName: product.digitalFileName ?? '',
    sessionId,
    status: 'paid',
    grantedAt: Date.now(),
  }, { merge: true });
};

export const createStoreCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to buy this product.');
  }

  const productId = String(request.data?.productId ?? '');
  const currency = normalizeCurrency(request.data?.currency);
  if (!productId) {
    throw new HttpsError('invalid-argument', 'A productId is required.');
  }

  const product = await getStoreProduct(productId);
  if (!product || !product.enabled) {
    throw new HttpsError('failed-precondition', 'This product is not available for checkout.');
  }
  if (product.stock === 0) {
    throw new HttpsError('failed-precondition', 'This product is out of stock.');
  }
  if (product.type === 'digital' && !product.digitalFilePath && !product.digitalFileUrl) {
    throw new HttpsError('failed-precondition', 'This digital product does not have a download attached.');
  }

  if (product.type === 'digital') {
    await db.doc(`users/${request.auth.uid}/digitalPurchases/${product.id}`).set({
      productId: product.id,
      productName: product.name,
      status: 'pending',
      updatedAt: Date.now(),
    }, { merge: true });
  }

  const origin = appUrl.value();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: request.auth.uid,
    success_url: product.type === 'digital'
      ? `${origin}/#/download?product=${encodeURIComponent(product.id)}&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/#/store?checkout=success&product=${encodeURIComponent(product.id)}`,
    cancel_url: `${origin}/#/store?checkout=cancel&product=${encodeURIComponent(product.id)}`,
    metadata: {
      kind: 'store',
      uid: request.auth.uid,
      productId: product.id,
      productType: product.type,
    },
    line_items: [
      {
        quantity: 1,
        price_data: await buildPriceData({
          amountInBaseCurrency: product.price,
          currency,
          name: product.name,
          description: product.description,
        }),
      },
    ],
  });

  if (!session.url) {
    throw new HttpsError('internal', 'Stripe Checkout did not return a session URL.');
  }

  return { url: session.url, currency };
});

export const createDonationCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to donate.');
  }

  const currency = normalizeCurrency(request.data?.currency);
  const amount = Number(request.data?.amount);
  const message = String(request.data?.message ?? '').trim().slice(0, 500);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'A valid donation amount is required.');
  }

  const roundedAmount = roundMajorAmount(amount, currency);
  const stripe = getStripe();
  const origin = appUrl.value();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: request.auth.uid,
    success_url: `${origin}/#/donate?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#/donate?checkout=cancel`,
    metadata: {
      kind: 'donation',
      uid: request.auth.uid,
      message,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toMinorUnits(roundedAmount, currency),
          product_data: {
            name: 'Support WahajPlayz',
            description: message || 'One-time support donation',
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new HttpsError('internal', 'Stripe Checkout did not return a session URL.');
  }

  return { url: session.url, currency, amount: roundedAmount };
});

export const createMembershipCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to subscribe.');
  }

  const tierId = String(request.data?.tierId ?? '');
  const billing = String(request.data?.billing ?? '') as Billing;
  const currency = normalizeCurrency(request.data?.currency);
  if (!tierId || !['monthly', 'yearly', 'lifetime'].includes(billing)) {
    throw new HttpsError('invalid-argument', 'A valid tierId and billing option are required.');
  }

  const tier = await getMembershipTier(tierId);
  if (!tier) {
    throw new HttpsError('not-found', 'Membership tier not found.');
  }

  const amountInBaseCurrency = billing === 'monthly'
    ? tier.monthlyPrice
    : billing === 'yearly'
      ? tier.yearlyPrice
      : tier.lifetimePrice;

  if (amountInBaseCurrency <= 0) {
    throw new HttpsError('failed-precondition', 'This membership option is not available for checkout.');
  }
  if (billing === 'lifetime' && !tier.lifetimeEnabled) {
    throw new HttpsError('failed-precondition', 'Lifetime billing is not enabled for this tier.');
  }

  const recurring = billing === 'lifetime' ? undefined : { interval: billing === 'monthly' ? 'month' as const : 'year' as const };
  const mode = billing === 'lifetime' ? 'payment' as const : 'subscription' as const;
  const stripe = getStripe();
  const origin = appUrl.value();
  const session = await stripe.checkout.sessions.create({
    mode,
    client_reference_id: request.auth.uid,
    success_url: `${origin}/#/membership?checkout=success&tier=${encodeURIComponent(tier.id)}&billing=${billing}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#/membership?checkout=cancel&tier=${encodeURIComponent(tier.id)}&billing=${billing}`,
    metadata: {
      kind: 'membership',
      uid: request.auth.uid,
      tierId: tier.id,
      billing,
    },
    line_items: [
      {
        quantity: 1,
        price_data: await buildPriceData({
          amountInBaseCurrency,
          currency,
          name: `${tier.name} Membership`,
          description: tier.description,
          recurring,
        }),
      },
    ],
  });

  if (!session.url) {
    throw new HttpsError('internal', 'Stripe Checkout did not return a session URL.');
  }

  return { url: session.url, currency };
});

export const verifyDigitalCheckoutSession = onCall({ secrets: [stripeSecretKey] }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to verify this purchase.');
  }

  const sessionId = String(request.data?.sessionId ?? '');
  if (!sessionId) {
    throw new HttpsError('invalid-argument', 'A sessionId is required.');
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const uid = session.metadata?.uid ?? session.client_reference_id;
  const productId = session.metadata?.productId;

  if (!uid || uid !== request.auth.uid || !productId) {
    throw new HttpsError('permission-denied', 'This checkout session does not belong to the signed-in user.');
  }

  const product = await getStoreProduct(productId);
  if (!product || (!product.digitalFilePath && !product.digitalFileUrl)) {
    throw new HttpsError('failed-precondition', 'The purchased product no longer has a digital file attached.');
  }

  if (session.payment_status === 'paid') {
    await grantDigitalPurchase(uid, product, session.id);
    return { status: 'paid' as const, productId };
  }

  return { status: 'pending' as const, productId };
});

export const getDigitalDownloadUrl = onCall(async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to download this product.');
  }

  const productId = String(request.data?.productId ?? '');
  if (!productId) {
    throw new HttpsError('invalid-argument', 'A productId is required.');
  }

  const purchaseSnap = await db.doc(`users/${request.auth.uid}/digitalPurchases/${productId}`).get();
  if (!purchaseSnap.exists || purchaseSnap.data()?.status !== 'paid') {
    throw new HttpsError('permission-denied', 'This download is not unlocked for the signed-in user.');
  }

  const product = await getStoreProduct(productId);
  if (!product) {
    throw new HttpsError('failed-precondition', 'This product no longer exists.');
  }

  if (product.digitalFilePath) {
    const [exists] = await bucket.file(product.digitalFilePath).exists();
    if (!exists) {
      throw new HttpsError('not-found', 'The requested download file was not found in storage.');
    }

    const [url] = await bucket.file(product.digitalFilePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 15,
      responseDisposition: `attachment; filename="${product.digitalFileName ?? 'download'}"`,
    });

    return { url };
  }

  if (!product.digitalFileUrl) {
    throw new HttpsError('failed-precondition', 'This product does not have a downloadable file.');
  }

  return { url: product.digitalFileUrl };
});

export const stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const signature = req.header('stripe-signature');
  if (!signature) {
    res.status(400).send('Missing Stripe signature');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Stripe webhook signature';
    res.status(400).send(message);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const kind = session.metadata?.kind;
    const uid = session.metadata?.uid ?? session.client_reference_id ?? '';

    if (kind === 'store') {
      const productId = session.metadata?.productId ?? '';
      const productType = session.metadata?.productType ?? '';
      const product = await getStoreProduct(productId);
      if (uid && productId && product && session.payment_status === 'paid') {
        await recordTransaction(session, {
          kind: 'store',
          uid,
          productId,
          productType,
        });
        if (productType === 'digital') {
          await grantDigitalPurchase(uid, product, session.id);
        }
      }
    }

    if (kind === 'donation') {
      await recordTransaction(session, {
        kind: 'donation',
        uid,
        message: session.metadata?.message ?? '',
      });
    }

    if (kind === 'membership') {
      const tierId = session.metadata?.tierId ?? '';
      const billing = session.metadata?.billing ?? '';
      await recordTransaction(session, {
        kind: 'membership',
        uid,
        tierId,
        billing,
        subscriptionId: session.subscription ?? null,
      });

      if (uid && tierId) {
        await db.doc(`users/${uid}/memberships/${tierId}`).set({
          tierId,
          billing,
          status: session.mode === 'subscription' ? 'active' : session.payment_status,
          sessionId: session.id,
          subscriptionId: session.subscription ?? null,
          updatedAt: Date.now(),
        }, { merge: true });
      }

      if (typeof session.subscription === 'string') {
        await db.collection('stripe_subscriptions').doc(session.subscription).set({
          uid,
          tierId,
          billing,
          status: 'active',
          sessionId: session.id,
          updatedAt: Date.now(),
        }, { merge: true });
      }
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const invoiceParent = invoice.parent as { subscription_details?: { subscription?: string | null } } | null;
    const subscriptionId = invoiceParent?.subscription_details?.subscription;

    if (typeof subscriptionId === 'string') {
      const subSnap = await db.collection('stripe_subscriptions').doc(subscriptionId).get();
      if (subSnap.exists) {
        const data = subSnap.data() as { uid?: string; tierId?: string; billing?: string };
        const invoiceId = typeof invoice.id === 'string' && invoice.id ? invoice.id : 'invoice-fallback';
        await db.collection('transactions').doc(invoiceId).set({
          id: invoiceId,
          kind: 'membership-renewal',
          uid: data.uid ?? '',
          tierId: data.tierId ?? '',
          billing: data.billing ?? '',
          currency: invoice.currency?.toUpperCase() ?? '',
          amountTotal: invoice.amount_paid ?? 0,
          status: 'paid',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    await db.collection('stripe_subscriptions').doc(subscription.id).set({
      status: 'canceled',
      updatedAt: Date.now(),
    }, { merge: true });
  }

  res.status(200).json({ received: true });
});



