import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CurrencyInfo {
  code: string; symbol: string; flag: string; name: string;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  GBP: { code: 'GBP', symbol: '£',    flag: '🇬🇧', name: 'British Pound' },
  USD: { code: 'USD', symbol: '$',    flag: '🇺🇸', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€',    flag: '🇪🇺', name: 'Euro' },
  CAD: { code: 'CAD', symbol: 'CA$',  flag: '🇨🇦', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$',   flag: '🇦🇺', name: 'Australian Dollar' },
  JPY: { code: 'JPY', symbol: '¥',    flag: '🇯🇵', name: 'Japanese Yen' },
  CHF: { code: 'CHF', symbol: 'Fr',   flag: '🇨🇭', name: 'Swiss Franc' },
  SEK: { code: 'SEK', symbol: 'kr',   flag: '🇸🇪', name: 'Swedish Krona' },
  NOK: { code: 'NOK', symbol: 'kr',   flag: '🇳🇴', name: 'Norwegian Krone' },
  DKK: { code: 'DKK', symbol: 'kr',   flag: '🇩🇰', name: 'Danish Krone' },
  NZD: { code: 'NZD', symbol: 'NZ$',  flag: '🇳🇿', name: 'New Zealand Dollar' },
  SGD: { code: 'SGD', symbol: 'S$',   flag: '🇸🇬', name: 'Singapore Dollar' },
  HKD: { code: 'HKD', symbol: 'HK$',  flag: '🇭🇰', name: 'Hong Kong Dollar' },
  MXN: { code: 'MXN', symbol: 'MX$',  flag: '🇲🇽', name: 'Mexican Peso' },
  BRL: { code: 'BRL', symbol: 'R$',   flag: '🇧🇷', name: 'Brazilian Real' },
  INR: { code: 'INR', symbol: '₹',    flag: '🇮🇳', name: 'Indian Rupee' },
  ZAR: { code: 'ZAR', symbol: 'R',    flag: '🇿🇦', name: 'South African Rand' },
  PLN: { code: 'PLN', symbol: 'zł',   flag: '🇵🇱', name: 'Polish Złoty' },
  CZK: { code: 'CZK', symbol: 'Kč',   flag: '🇨🇿', name: 'Czech Koruna' },
  RON: { code: 'RON', symbol: 'lei',  flag: '🇷🇴', name: 'Romanian Leu' },
  // Middle East & Africa
  AED: { code: 'AED', symbol: 'AED',  flag: '🇦🇪', name: 'UAE Dirham' },
  SAR: { code: 'SAR', symbol: 'SAR',  flag: '🇸🇦', name: 'Saudi Riyal' },
  QAR: { code: 'QAR', symbol: 'QAR',  flag: '🇶🇦', name: 'Qatari Riyal' },
  ILS: { code: 'ILS', symbol: '₪',    flag: '🇮🇱', name: 'Israeli Shekel' },
  EGP: { code: 'EGP', symbol: 'E£',   flag: '🇪🇬', name: 'Egyptian Pound' },
  NGN: { code: 'NGN', symbol: '₦',    flag: '🇳🇬', name: 'Nigerian Naira' },
  KES: { code: 'KES', symbol: 'KSh',  flag: '🇰🇪', name: 'Kenyan Shilling' },
  // Asia-Pacific
  KRW: { code: 'KRW', symbol: '₩',    flag: '🇰🇷', name: 'South Korean Won' },
  TWD: { code: 'TWD', symbol: 'NT$',  flag: '🇹🇼', name: 'Taiwan Dollar' },
  THB: { code: 'THB', symbol: '฿',    flag: '🇹🇭', name: 'Thai Baht' },
  MYR: { code: 'MYR', symbol: 'RM',   flag: '🇲🇾', name: 'Malaysian Ringgit' },
  IDR: { code: 'IDR', symbol: 'Rp',   flag: '🇮🇩', name: 'Indonesian Rupiah' },
  PHP: { code: 'PHP', symbol: '₱',    flag: '🇵🇭', name: 'Philippine Peso' },
  // Europe (non-Euro)
  TRY: { code: 'TRY', symbol: '₺',    flag: '🇹🇷', name: 'Turkish Lira' },
  HUF: { code: 'HUF', symbol: 'Ft',   flag: '🇭🇺', name: 'Hungarian Forint' },
  BGN: { code: 'BGN', symbol: 'лв',   flag: '🇧🇬', name: 'Bulgarian Lev' },
  UAH: { code: 'UAH', symbol: '₴',    flag: '🇺🇦', name: 'Ukrainian Hryvnia' },
  // Latin America
  COP: { code: 'COP', symbol: 'COP$', flag: '🇨🇴', name: 'Colombian Peso' },
  CLP: { code: 'CLP', symbol: 'CLP$', flag: '🇨🇱', name: 'Chilean Peso' },
  ARS: { code: 'ARS', symbol: 'ARS$', flag: '🇦🇷', name: 'Argentine Peso' },
};

interface CurrencyContextType {
  currency: CurrencyInfo;
  setCurrency: (code: string) => void;
  convert: (amount: number, fromCode?: string) => number;
  formatPrice: (amount: number, fromCode?: string) => string;
  ratesReady: boolean;
  userCountry: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyInfo>(() => {
    const saved = localStorage.getItem('wahaj_currency');
    return (saved && CURRENCIES[saved]) ? CURRENCIES[saved] : CURRENCIES.USD;
  });

  // Exchange rates relative to USD — fetched once on mount
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesReady, setRatesReady] = useState(false);
  const [userCountry, setUserCountry] = useState('');

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data.rates) { setRates(data.rates); setRatesReady(true); }
      })
      .catch(() => setRatesReady(true)); // fail gracefully — show original amounts
  }, []);

  // Auto-detect currency from IP if not saved
  useEffect(() => {
    if (localStorage.getItem('wahaj_currency')) return;
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const code: string = data.currency;
        if (CURRENCIES[code]) setCurrencyState(CURRENCIES[code]);
        setUserCountry(data.country_code || '');
      })
      .catch(() => {});
  }, []);

  const setCurrency = (code: string) => {
    if (!CURRENCIES[code]) return;
    localStorage.setItem('wahaj_currency', code);
    setCurrencyState(CURRENCIES[code]);
  };

  // Convert amount from any currency to the currently selected currency
  const convert = (amount: number, fromCode = 'USD'): number => {
    if (fromCode === currency.code) return amount;
    if (!rates[fromCode] || !rates[currency.code]) return amount;
    // amount → USD → target
    const inUSD = amount / rates[fromCode];
    return inUSD * rates[currency.code];
  };

  // Format a price: converts then formats with current symbol
  const formatPrice = (amount: number, fromCode = 'USD'): string => {
    const converted = convert(amount, fromCode);
    // JPY and similar don't use decimals
    const noDecimals = ['JPY', 'KRW', 'CLP', 'VND', 'IDR', 'TWD', 'HUF'].includes(currency.code);
    return `${currency.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: noDecimals ? 0 : 2,
      maximumFractionDigits: noDecimals ? 0 : 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatPrice, ratesReady, userCountry }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
