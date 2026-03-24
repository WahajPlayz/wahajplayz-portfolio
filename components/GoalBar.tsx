import React, { useEffect, useRef, useState } from 'react';
import { useSupportData } from '../context/SupportContext';
import { useCurrency } from '../context/CurrencyContext';

const GoalBar: React.FC = () => {
  const { config } = useSupportData();
  const { goal } = config;
  const { formatPrice, convert } = useCurrency();
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setAnimated(true); obs.disconnect(); }
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (!goal.enabled) return null;

  // Convert stored amounts from the goal's base currency to the user's selected currency
  const base = goal.currencyCode || 'GBP';
  const raisedConverted = convert(goal.raised, base);
  const targetConverted = convert(goal.target, base);
  const pct = Math.min(100, Math.round((raisedConverted / targetConverted) * 100));
  const isComplete = raisedConverted >= targetConverted;

  return (
    <div ref={ref} className="mb-12">
      {isComplete && (
        <div
          className="p-4 rounded-xl text-center font-orbitron font-bold text-sm tracking-widest mb-6"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
        >
          🎉 Goal reached! Thank you so much — you made this happen.
        </div>
      )}

      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="font-orbitron font-black text-white text-sm tracking-widest uppercase">
            {goal.type === 'monthly' ? 'Monthly Goal' : 'Goal'}
          </p>
          {goal.description && (
            <p className="text-gray-500 text-xs mt-0.5">{goal.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-orbitron font-black text-sm" style={{ color: '#00d4ff' }}>
            {formatPrice(goal.raised, base)}
            <span className="text-gray-500 font-normal"> / {formatPrice(goal.target, base)}</span>
          </p>
          <p className="text-xs text-gray-600">{pct}% funded</p>
        </div>
      </div>

      {/* Progress track */}
      <div
        className="relative h-3 rounded-full overflow-hidden mb-4"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-[1200ms] ease-out"
          style={{
            width: animated ? `${pct}%` : '0%',
            background: isComplete
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : 'linear-gradient(90deg, #00d4ff, #a855f7)',
            boxShadow: isComplete
              ? '0 0 16px rgba(34,197,94,0.5)'
              : '0 0 16px rgba(0,212,255,0.5)',
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>

      {/* Milestones */}
      <div className="flex gap-2 flex-wrap">
        {goal.milestones.map((m, i) => {
          const mConverted = convert(m.amount, base);
          const reached = raisedConverted >= mConverted;
          const isCurrent = !reached && (i === 0 || raisedConverted >= convert(goal.milestones[i - 1].amount, base));
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: reached ? 'rgba(34,197,94,0.12)' : isCurrent ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${reached ? 'rgba(34,197,94,0.4)' : isCurrent ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: reached ? '#4ade80' : isCurrent ? '#00d4ff' : '#4b5563',
                boxShadow: isCurrent ? '0 0 10px rgba(0,212,255,0.2)' : 'none',
              }}
            >
              <span>{reached ? '✅' : isCurrent ? '✨' : '🔒'}</span>
              <span>{formatPrice(m.amount, base)}</span>
              <span className="opacity-70">— {m.label}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default GoalBar;
