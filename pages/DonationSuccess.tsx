import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrency } from '@/context/CurrencyContext';

const API_BASE = (import.meta as any).env?.VITE_STRIPE_API_BASE as string || '';

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'IDR', 'TWD', 'HUF']);

interface DonationResult {
  donorName: string;
  amountGBP: number;
  amountOriginal: number;
  currencyOriginal: string;
  message: string;
}

const formatOriginalAmount = (amountMinor: number, currency: string) => {
  const major = ZERO_DECIMAL.has(currency) ? amountMinor : amountMinor / 100;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
};

const DonationSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<DonationResult | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');

    if (!sessionId || !API_BASE) {
      setStatus('error');
      return;
    }

    fetch(`${API_BASE}/api/stripe/donation-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setResult(data);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[48rem] h-[48rem] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.3), transparent 65%)' }} />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.25), transparent 65%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">

        {status === 'loading' && (
          <div>
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
            <p className="font-orbitron text-sm text-gray-400 tracking-widest uppercase">Processing your donation…</p>
          </div>
        )}

        {status === 'success' && result && (
          <div>
            <div
              className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.25),rgba(168,85,247,0.2))', border: '1px solid rgba(236,72,153,0.4)' }}
            >
              💜
            </div>

            <p className="text-xs font-orbitron tracking-[0.34em] uppercase text-pink-400 mb-3">Thank You</p>

            <h1
              className="font-orbitron font-black text-4xl md:text-5xl mb-4 leading-tight"
              style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {result.donorName !== 'Anonymous' ? result.donorName.split(' ')[0] + '!' : "You're amazing!"}
            </h1>

            <div
              className="inline-block px-6 py-3 rounded-2xl mb-6 font-orbitron font-black text-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.25)', color: '#00d4ff' }}
            >
              {formatOriginalAmount(result.amountOriginal, result.currencyOriginal)}
              {result.currencyOriginal !== 'GBP' && (
                <span className="text-sm font-normal text-gray-500 ml-2">≈ {formatPrice(result.amountGBP, 'GBP')}</span>
              )}
            </div>

            <p className="text-gray-400 text-base mb-8 max-w-sm mx-auto leading-relaxed">
              Your support means everything. The goal bar has been updated and your donation is now live on the supporter wall.
            </p>

            <div
              className="rounded-2xl border p-5 mb-8 text-left"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(236,72,153,0.2)' }}
            >
              <p className="text-xs font-orbitron text-pink-400 uppercase tracking-widest mb-3">Your Entry on the Wall</p>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-orbitron font-black text-sm"
                  style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.25),rgba(168,85,247,0.2))', color: '#f9a8d4' }}
                >
                  {result.donorName[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{result.donorName}</p>
                  <p className="text-pink-400 font-mono text-xs">£{Number(result.amountGBP).toFixed(2)}</p>
                </div>
              </div>
              {result.message ? (
                <p className="text-gray-300 text-sm leading-relaxed italic">"{result.message}"</p>
              ) : (
                <p className="text-gray-600 text-xs italic">No message — your name and amount will still appear on the wall.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/donate')}
                className="px-6 py-3 rounded-xl font-orbitron font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: '#fff' }}
              >
                See the Supporter Wall →
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl font-orbitron font-bold text-sm text-gray-400 transition-all hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div
              className="w-20 h-20 mx-auto mb-8 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              ⚠️
            </div>
            <h1 className="font-orbitron font-black text-3xl text-white mb-4">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              We couldn't confirm your donation automatically. If your payment went through, it will still be recorded — please check back shortly or contact support.
            </p>
            <button
              onClick={() => navigate('/donate')}
              className="px-6 py-3 rounded-xl font-orbitron font-bold text-sm text-gray-400 hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              ← Back to Donate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationSuccessPage;
