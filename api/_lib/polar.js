import { Polar } from '@polar-sh/sdk';

let instance = null;

export const getPolar = () => {
  if (!instance) {
    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Missing POLAR_ACCESS_TOKEN');
    instance = new Polar({
      accessToken,
      server: process.env.POLAR_SERVER || 'production',
    });
  }
  return instance;
};

export const getAppUrl = () =>
  (process.env.APP_URL || 'https://wahajplayz.org').replace(/\/$/, '');

// Keep in sync with POLAR_SUPPORTED_CURRENCIES in lib/polarCurrencies.ts (uppercase).
export const POLAR_CURRENCIES = new Set([
  'aed','ars','aud','brl','cad','chf','clp','cny','cop','czk','dkk',
  'eur','gbp','hkd','huf','idr','ils','inr','jpy','krw','mxn','myr',
  'nok','nzd','pen','php','pln','ron','sar','sek','sgd','thb','try',
  'twd','usd','zar',
]);

// Polar follows ISO 4217 strictly — only JPY, KRW, CLP are zero-decimal.
// HUF, IDR, TWD are 2-decimal in Polar's API (priceAmount is in cents).
const ZERO_DECIMAL = new Set(['jpy','krw','clp']);

export const resolveCurrency = (code) => {
  const lower = (code || '').toLowerCase();
  return POLAR_CURRENCIES.has(lower) ? lower : 'gbp';
};

export const toMinorUnits = (amount, currency) =>
  ZERO_DECIMAL.has((currency || '').toLowerCase())
    ? Math.round(amount)
    : Math.round(amount * 100);

// Build a Polar `prices` array from a map of { currencyCode: majorUnitAmount }.
// Currencies not in POLAR_CURRENCIES are filtered out. Amounts <= 0 are skipped.
export const buildPolarPricesArray = (pricesByCurrency) => {
  if (!pricesByCurrency || typeof pricesByCurrency !== 'object') return [];
  const result = [];
  for (const [code, amount] of Object.entries(pricesByCurrency)) {
    const lower = code.toLowerCase();
    if (!POLAR_CURRENCIES.has(lower)) continue;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    result.push({
      amountType: 'fixed',
      priceAmount: toMinorUnits(amount, lower),
      priceCurrency: lower,
    });
  }
  return result;
};
