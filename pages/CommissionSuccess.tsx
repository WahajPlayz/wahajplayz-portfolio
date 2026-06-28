import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Brush } from 'lucide-react';

const CommissionSuccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-6 py-12" style={{ backgroundColor: '#0d0e12' }}>
      <div
        className="w-full max-w-lg p-8 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(236,72,153,0.2)' }}
      >
        <button
          onClick={() => navigate('/commissions')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs mb-10"
        >
          <ArrowLeft size={14} /> Back to Commissions
        </button>

        {/* Success icon */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full mb-6"
            style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.35)' }}>
            <div className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: 'rgba(236,72,153,0.2)' }} />
            <Check size={36} className="relative" style={{ color: '#ec4899' }} />
          </div>

          <p className="text-xs font-orbitron tracking-[0.34em] uppercase mb-3" style={{ color: '#ec4899' }}>
            Payment Received
          </p>
          <h1 className="font-orbitron font-black text-3xl text-white mb-3">
            Thank You!
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Your commission request has been submitted and your payment has gone through. I'll review your request and reach out to you via the contact info you provided.
          </p>
        </div>

        {/* Info card */}
        <div className="mb-8 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Brush size={14} style={{ color: '#ec4899' }} />
            <p className="font-orbitron font-bold text-xs tracking-widest uppercase text-gray-400">What happens next</p>
          </div>
          <ul className="flex flex-col gap-2">
            {[
              'Your payment is confirmed — check your email for a receipt from Polar.',
              "I'll review the details of your request.",
              "I'll reach out to you using the contact info you provided to discuss and get started.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-400">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-orbitron font-bold text-[10px]"
                  style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.3)', color: '#ec4899' }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-[1.02]"
          style={{
            background: 'rgba(236,72,153,0.1)',
            border: '1px solid rgba(236,72,153,0.4)',
            color: '#ec4899',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default CommissionSuccess;
