import React, { useMemo, useState } from 'react';
import { Heart, LockKeyhole, MessageSquareHeart, Sparkles } from 'lucide-react';
import { useSupportData } from '@/context/SupportContext';
import { useCurrency } from '@/context/CurrencyContext';
import { startDonationCheckout } from '@/lib/stripeCheckout';

const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'IDR', 'TWD', 'HUF']);

const DonationPanel: React.FC = () => {
  const { config } = useSupportData();
  const baseCurrency = (config.goals?.[0]?.currencyCode || 'GBP') || 'GBP';
  const { currency, formatPrice, convert } = useCurrency();
  const { donation } = config;
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [startingCheckout, setStartingCheckout] = useState(false);

  const normalizeAmount = (value: number) => {
    const decimals = ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2;
    return Number(convert(value, baseCurrency).toFixed(decimals));
  };

  const finalAmount = custom ? parseFloat(custom) : amount;
  const amountLabel = useMemo(() => finalAmount ? `${currency.symbol}${finalAmount.toLocaleString(undefined, {
    minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2,
    maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2,
  })}` : null, [currency.code, currency.symbol, finalAmount]);

  const launchCheckout = async () => {
    if (!finalAmount || finalAmount <= 0 || startingCheckout) return;
    setCheckoutError('');
    setStartingCheckout(true);
    try {
      await startDonationCheckout(finalAmount, currency.code, message.trim());
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Failed to start Stripe Checkout.';
      setCheckoutError(nextError);
      setStartingCheckout(false);
    }
  };

  const handleDonate = () => {
    void launchCheckout();
  };

  return (
    <div
      id="donate"
      className="max-w-5xl mx-auto rounded-[28px] border overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(12,13,18,0.96), rgba(9,10,14,0.98))', borderColor: 'rgba(236,72,153,0.22)', boxShadow: '0 30px 80px rgba(0,0,0,0.45)' }}
    >
      <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-white/10">
          <p className="font-orbitron text-xs tracking-[0.32em] uppercase mb-4" style={{ color: '#ec4899' }}>Direct Support</p>
          <h3 className="font-orbitron font-black text-3xl md:text-4xl text-white mb-3">{donation.heading}</h3>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mb-8">{donation.subheading}</p>

          <div className="grid sm:grid-cols-3 gap-3 mb-8">
            {[
              { icon: <Sparkles size={16} />, title: 'Fuel Development', body: 'Support new features, prototypes, polish, and the time needed to keep building.' },
              { icon: <MessageSquareHeart size={16} />, title: 'Leave A Note', body: 'Add an optional message so support feels personal instead of anonymous.' },
              { icon: <LockKeyhole size={16} />, title: 'Stripe Checkout', body: 'Checkout now uses dynamic Stripe sessions in the real payment currency.' },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border p-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-3" style={{ background: 'rgba(236,72,153,0.12)', color: '#ec4899' }}>
                  {card.icon}
                </div>
                <p className="font-orbitron text-sm text-white mb-1">{card.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border p-5" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.08))', borderColor: 'rgba(236,72,153,0.24)' }}>
            <p className="text-xs uppercase tracking-[0.28em] text-pink-300/80 mb-2">Selected Support</p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-orbitron font-black text-3xl md:text-4xl text-white">{amountLabel || 'Choose an amount'}</p>
                <p className="text-xs text-gray-400 mt-1">Checkout will charge in {currency.code} for this session.</p>
              </div>
              {amountLabel && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border text-sm" style={{ borderColor: 'rgba(236,72,153,0.28)', color: '#f9a8d4', background: 'rgba(0,0,0,0.18)' }}>
                  <Heart size={14} fill="currentColor" />
                  Ready
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-6">
            <p className="font-orbitron text-xs tracking-[0.28em] uppercase text-cyan-300 mb-2">Quick Tip</p>
            <h4 className="font-orbitron font-bold text-2xl text-white mb-2">Pick an amount and go.</h4>
            <p className="text-gray-500 text-sm">Preset amounts are converted from the base support amounts into your selected checkout currency.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {donation.presetAmounts.map(p => {
              const localAmount = normalizeAmount(p);
              return (
                <button
                  key={p}
                  onClick={() => { setAmount(localAmount); setCustom(''); }}
                  className="py-4 px-4 text-left font-orbitron font-bold text-sm transition-all"
                  style={amount === localAmount && !custom
                    ? { background: 'linear-gradient(135deg, rgba(236,72,153,0.22), rgba(168,85,247,0.18))', border: '1px solid rgba(236,72,153,0.65)', color: '#fff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)', boxShadow: '0 12px 24px rgba(236,72,153,0.18)' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <span className="block text-lg">{formatPrice(p, baseCurrency)}</span>
                  <span className="block mt-1 text-[11px] text-gray-500 font-mono">One-time support</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-gray-500">{currency.code}</span>
            <input
              type="number"
              placeholder="Custom amount"
              value={custom}
              onChange={e => { setCustom(e.target.value); setAmount(null); }}
              className="w-full pl-16 pr-4 py-4 rounded-2xl bg-black/20 font-mono text-sm outline-none border"
              style={{ borderColor: 'rgba(236,72,153,0.25)', color: '#fff' }}
              min="1"
            />
          </div>

          <textarea
            placeholder="Leave a message (optional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="w-full px-4 py-4 rounded-2xl bg-black/20 font-mono text-sm outline-none resize-none mb-5 border"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#d1d5db' }}
          />

          <button
            onClick={handleDonate}
            disabled={!finalAmount || finalAmount <= 0 || startingCheckout}
            className="w-full flex items-center justify-center gap-2 py-4 font-orbitron font-bold text-sm tracking-[0.2em] uppercase transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(168,85,247,0.9))', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', boxShadow: '0 20px 45px rgba(168,85,247,0.22)' }}
          >
            <Heart size={16} fill="currentColor" />
            {startingCheckout ? 'Opening Stripe Checkout' : amountLabel ? `Support With ${amountLabel}` : 'Select An Amount'}
          </button>

          {checkoutError && <p className="text-red-400 text-xs mt-4">{checkoutError}</p>}
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Checkout opens in Stripe without requiring a site login for one-time donations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DonationPanel;
