import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Gem, Coffee, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';

const StickyMembershipBar: React.FC = () => {
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  // Push header down 48px
  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'sticky-bar-push';
    el.textContent = 'header { top: 48px !important; }';
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = Object.values(CURRENCIES).filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed top-0 left-0 w-full z-[200] flex items-center justify-between px-4"
      style={{
        height: 48,
        backdropFilter: 'blur(16px)',
        background: 'rgba(13,14,18,0.85)',
        borderBottom: '1px solid rgba(0,212,255,0.12)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Left buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/membership')}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-orbitron font-bold tracking-widest uppercase transition-all hover:scale-105"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.4)',
            color: '#818cf8',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <Gem size={12} />
          <span className="hidden sm:inline">Membership</span>
        </button>
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-orbitron font-bold tracking-widest uppercase transition-all hover:scale-105"
          style={{
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.25)',
            color: '#22d3ee',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <ShoppingBag size={12} />
          <span className="hidden sm:inline">Store</span>
        </button>
        <button
          onClick={() => navigate('/donate')}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-orbitron font-bold tracking-widest uppercase transition-all hover:scale-105"
          style={{
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.3)',
            color: '#00d4ff',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <Coffee size={12} />
          <span className="hidden sm:inline">Support & Donate</span>
        </button>
      </div>

      {/* Right: currency badge */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => { setDropdownOpen(o => !o); setSearch(''); }}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-orbitron font-bold tracking-widest uppercase transition-all hover:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
            clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
          }}
        >
          <span>{currency.flag}</span>
          <span>{currency.code}</span>
          <ChevronDown size={10} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 w-64 rounded-lg overflow-hidden shadow-2xl z-50"
            style={{
              background: 'rgba(13,14,18,0.98)',
              border: '1px solid rgba(0,212,255,0.2)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="p-2 border-b border-white/5">
              <input
                type="text"
                placeholder="Search currency..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs outline-none focus:border-cyan-500/50"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c.code); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors hover:bg-white/5"
                  style={{ color: c.code === currency.code ? '#00d4ff' : '#9ca3af' }}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="font-bold">{c.code}</span>
                  <span className="ml-auto opacity-60">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickyMembershipBar;
