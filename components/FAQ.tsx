import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ChevronDown } from 'lucide-react';

const FAQ: React.FC = () => {
  const { faqData } = useData();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-24 relative overflow-hidden" style={{ background: '#10111a' }}>
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 70%)' }} />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12" style={{ background: '#ec4899' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#ec4899' }}>// FAQ</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #ec4899, transparent)' }} />
        </div>
        <h2 className="font-orbitron font-black text-white mb-12" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
          FREQUENTLY ASKED <span style={{ color: '#ec4899', textShadow: '0 0 20px rgba(236,72,153,0.5)' }}>QUESTIONS</span>
        </h2>

        {faqData.length === 0 ? (
          <p className="text-center text-gray-600 font-mono">// No questions yet.</p>
        ) : (
          <div className="space-y-3">
            {faqData.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => toggleFAQ(item.id)}
                  className="w-full flex items-center justify-between p-5 text-left group transition-all duration-300"
                  style={{
                    background: openId === item.id ? 'rgba(236,72,153,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${openId === item.id ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    clipPath: openId === item.id
                      ? 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)'
                      : 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                    borderBottom: openId === item.id ? 'none' : undefined,
                  }}
                >
                  <span className="text-sm font-semibold text-gray-300 group-hover:text-white pr-4 font-orbitron tracking-wide">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`flex-shrink-0 transform transition-transform duration-300 ${openId === item.id ? 'rotate-180' : ''}`}
                    style={{ color: openId === item.id ? '#ec4899' : '#4b5563' }}
                    size={18}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openId === item.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
                  style={{ border: openId === item.id ? '1px solid rgba(236,72,153,0.3)' : 'none', borderTop: 'none', background: 'rgba(236,72,153,0.03)' }}
                >
                  <div className="p-5 text-gray-400 text-sm leading-relaxed">{item.answer}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQ;
