import Stripe from 'stripe';

const BASE_CURRENCY = 'GBP';
const SUPPORTED_CURRENCIES = new Set([
  'GBP', 'USD', 'EUR', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK',
  'NZD', 'SGD', 'HKD', 'MXN', 'BRL', 'INR', 'ZAR', 'PLN', 'CZK', 'RON',
  // Middle East & Africa
  'AED', 'SAR', 'QAR', 'ILS', 'EGP', 'NGN', 'KES',
  // Asia-Pacific
  'KRW', 'TWD', 'THB', 'MYR', 'IDR', 'PHP',
  // Europe (non-Euro)
  'TRY', 'HUF', 'BGN', 'UAH',
  // Latin America
  'COP', 'CLP', 'ARS',
]);
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'IDR', 'TWD', 'HUF']);

let exchangeRateCache = null;
let stripeInstance = null;

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'));
  }
  return stripeInstance;
};

export const getAppUrl = () => process.env.APP_URL || 'https://www.wahajplayz.org';

export const normalizeCurrency = (currency) => {
  const code = String(currency || BASE_CURRENCY).toUpperCase();
  return SUPPORTED_CURRENCIES.has(code) ? code : BASE_CURRENCY;
};

const roundMajorAmount = (amount, currency) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency)) return Math.round(amount);
  return Math.round(amount * 100) / 100;
};

export const toMinorUnits = (amount, currency) => {
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
    throw new Error('Failed to fetch exchange rates.');
  }

  const data = await response.json();
  if (!data?.rates) {
    throw new Error('Exchange rate response was invalid.');
  }

  exchangeRateCache = {
    base,
    fetchedAt: now,
    rates: data.rates,
  };

  return data.rates;
};

export const convertFromBaseCurrency = async (amount, currency) => {
  if (currency === BASE_CURRENCY) return roundMajorAmount(amount, currency);
  const rates = await getExchangeRates(BASE_CURRENCY);
  const rate = rates[currency];
  if (!rate) {
    throw new Error(`Currency ${currency} is not currently available.`);
  }
  return roundMajorAmount(amount * rate, currency);
};

export const buildPriceData = async ({ amountInBaseCurrency, currency, name, description, recurring }) => {
  const amount = await convertFromBaseCurrency(amountInBaseCurrency, currency);
  return {
    currency: currency.toLowerCase(),
    unit_amount: toMinorUnits(amount, currency),
    recurring,
    product_data: {
      name,
      description,
    },
  };
};

export const convertToBaseCurrency = async (amountInMinorUnits, fromCurrency) => {
  const currency = String(fromCurrency || BASE_CURRENCY).toUpperCase();
  const major = ZERO_DECIMAL_CURRENCIES.has(currency)
    ? amountInMinorUnits
    : amountInMinorUnits / 100;
  if (currency === BASE_CURRENCY) return roundMajorAmount(major, BASE_CURRENCY);
  const rates = await getExchangeRates(BASE_CURRENCY);
  const rate = rates[currency];
  if (!rate) return 0;
  return roundMajorAmount(major / rate, BASE_CURRENCY);
};

export const BASE_STRIPE_CURRENCY = BASE_CURRENCY;
