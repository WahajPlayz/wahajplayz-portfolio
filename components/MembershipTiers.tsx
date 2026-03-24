import React, { useState, useEffect } from 'react';
import { Check, Star } from 'lucide-react';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { startMembershipCheckout } from '@/lib/stripeCheckout';

type Billing = 'monthly' | 'yearly' | 'lifetime';

const MembershipTiers: React.FC = () => {
  const { config } = useSupportData();
  const baseCurrency = config.goal.currencyCode || 'GBP';
  const { user, openAuthModal } = useAuth();
  const { formatPrice, currency } = useCurrency();
  const { membership } = config;
  const [billing, setBilling] = useState<Billing>('monthly');
  const [checkoutError, setCheckoutError] = useState('');
  const [startingTierId, setStartingTierId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wahaj_billing') as Billing | null;
    if (saved) setBilling(saved);
  }, []);

  const handleBilling = (b: Billing) => {
    setBilling(b);
    localStorage.setItem('wahaj_billing', b);
  };

  const getPrice = (tier: typeof membership.tiers[0]) => {
    if (billing === 'monthly') return tier.monthlyPrice;
    if (billing === 'yearly') return tier.yearlyPrice;
    return tier.lifetimePrice;
  };

  const launchCheckout = async (tier: typeof membership.tiers[0]) => {
    setCheckoutError('');
    setStartingTierId(tier.id);
    try {
      await startMembershipCheckout(tier.id, billing, currency.code);
    } catch (error) {
      const nextError = error instanceof Error ? error.message : 'Failed to start Stripe Checkout.';
      setCheckoutError(nextError);
      setStartingTierId(null);
    }
  };

  const handleSelect = (tier: typeof membership.tiers[0]) => {
    if (!user) {
      openAuthModal(() => launchCheckout(tier));
      return;
    }
    void launchCheckout(tier);
  };

  const colClass = membership.tiers.length === 1
    ? 'max-w-sm mx-auto'
    : membership.tiers.length === 2
    ? 'grid md:grid-cols-2 max-w-3xl mx-auto gap-6'
    : 'grid md:grid-cols-3 gap-6';

  return (
    <div id="membership" className="mb-16">
      <h3 className="font-orbitron text-xl font-bold mb-2 text-center" style={{ color: '#a855f7' }}>
        {membership.heading}
      </h3>
      {membership.subheading && (
        <p className="text-gray-400 text-sm text-center mb-3">{membership.subheading}</p>
      )}
      <p className="text-gray-500 text-xs text-center mb-8">Membership checkout will open in {currency.code}.</p>

      <div className="flex justify-center mb-10">
        <div className="flex p-1 gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
          {(['monthly', 'yearly', 'lifetime'] as Billing[]).map(b => (
            <button
              key={b}
              onClick={() => handleBilling(b)}
              className="px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all"
              style={billing === b
                ? { background: 'rgba(168,85,247,0.3)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.6)' }
                : { color: '#6b7280', border: '1px solid transparent' }}
            >
              {b}{b === 'yearly' && membership.yearlyDiscountPercent ? ` (-${membership.yearlyDiscountPercent}%)` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className={colClass}>
        {membership.tiers.map(tier => {
          const price = getPrice(tier);
          const accent = tier.accentColour;
          const isStarting = startingTierId === tier.id;
          return (
            <div
              key={tier.id}
              className={`relative transition-all hover:-translate-y-1 ${tier.isPopular ? 'pt-10 px-6 pb-6' : 'p-6'}`}
              style={{
                background: `${accent}10`,
                border: `1px solid ${accent}40`,
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
                boxShadow: tier.isPopular ? `0 0 30px ${accent}25` : 'none',
              }}
            >
              {tier.isPopular && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 font-orbitron text-xs"
                  style={{ background: accent, color: '#000', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                  <Star size={10} fill="currentColor" /> POPULAR
                </div>
              )}
              <div className="mb-4">
                {tier.imageUrl ? (
                  <img src={tier.imageUrl} alt={tier.name} className="w-14 h-14 rounded-2xl object-cover mb-3 border border-white/10" />
                ) : null}
                <div className="font-orbitron font-bold text-lg mb-1" style={{ color: accent }}>
                  {!tier.imageUrl && tier.icon ? `${tier.icon} ` : ''}{tier.name}
                </div>
                <div className="text-gray-400 text-xs">{tier.description}</div>
              </div>
              <div className="mb-6">
                <span className="font-orbitron font-black text-4xl" style={{ color: accent }}>
                  {price === 0 ? 'FREE' : formatPrice(price, baseCurrency)}
                </span>
                {price !== 0 && (
                  <span className="text-gray-500 text-xs ml-2 font-mono">
                    /{billing === 'lifetime' ? 'once' : billing === 'yearly' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {tier.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: accent }} />
                    <span>{b.icon} {b.text}</span>
                  </li>
                ))}
                {billing === 'lifetime' && tier.lifetimeExtraBenefits.map((b, i) => (
                  <li key={'lt-' + i} className="flex items-start gap-2 text-sm font-semibold" style={{ color: accent }}>
                    <Check size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{b.icon} {b.text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSelect(tier)}
                disabled={isStarting}
                className="w-full py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `${accent}20`,
                  border: `1px solid ${accent}60`,
                  color: accent,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                }}
              >
                {isStarting ? 'Opening Checkout' : `Get ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {checkoutError && <p className="text-red-400 text-xs text-center mt-6">{checkoutError}</p>}
    </div>
  );
};

export default MembershipTiers;
