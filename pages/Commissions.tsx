import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupportData } from '@/context/SupportContext';
import { useCurrency } from '@/hooks/useCurrency';
import { startCommissionCheckout } from '@/lib/stripeCheckout';
import { X, ImageOff, CheckCircle, XCircle } from 'lucide-react';

const Commissions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { config } = useSupportData();
  const { commissionsConfig } = config;
  const { formatPrice } = useCurrency();

  const checkoutState = searchParams.get('checkout'); // 'success' | 'cancel' | null

  const [selectedService, setSelectedService] = useState<{ id: string; title: string; basePrice: number } | null>(null);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openModal = (svc: { id: string; title: string; basePrice: number }) => {
    setSelectedService(svc);
    setDescription('');
    setContact('');
    setErrorMsg('');
  };

  const closeModal = () => {
    setSelectedService(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !contact.trim() || !selectedService) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await startCommissionCheckout(
        selectedService.title,
        selectedService.basePrice,
        'GBP',
        description.trim(),
        contact.trim(),
      );
      // redirects away — no further state needed
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div style={{ height: 48 }} />

      {/* Back button */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-2 mb-10"
        >
          <span>←</span> Back
        </button>
      </div>

      {/* Payment result banners */}
      {checkoutState === 'success' && (
        <div className="max-w-5xl mx-auto px-6 mb-8">
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' }}>
            <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
            <div>
              <p className="font-orbitron font-bold text-sm text-white">Payment received!</p>
              <p className="text-gray-400 text-xs mt-0.5">Your commission request has been submitted. I'll reach out to you soon via the contact info you provided.</p>
            </div>
          </div>
        </div>
      )}
      {checkoutState === 'cancel' && (
        <div className="max-w-5xl mx-auto px-6 mb-8">
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <XCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
            <p className="text-gray-400 text-sm">Checkout was cancelled. No payment was taken.</p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="text-center">
          <p className="text-xs font-orbitron tracking-[0.34em] uppercase mb-3" style={{ color: '#ec4899' }}>
            Services
          </p>
          <h1 className="font-orbitron font-black text-4xl sm:text-5xl mb-4" style={{ color: '#ffffff', textShadow: '0 0 40px rgba(236,72,153,0.3)' }}>
            {commissionsConfig.heading}
          </h1>
          <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">
            {commissionsConfig.subheading}
          </p>
          {/* Open/Closed badge */}
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 font-orbitron font-bold text-xs tracking-widest uppercase"
            style={{
              background: commissionsConfig.isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${commissionsConfig.isOpen ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: commissionsConfig.isOpen ? '#22c55e' : '#ef4444',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: commissionsConfig.isOpen ? '#22c55e' : '#ef4444', boxShadow: `0 0 6px ${commissionsConfig.isOpen ? '#22c55e' : '#ef4444'}` }}
            />
            {commissionsConfig.isOpen ? 'Commissions Open' : 'Commissions Closed'}
          </span>
        </div>
      </div>

      {/* Services */}
      <div className="max-w-5xl mx-auto px-6 mb-24">
        {commissionsConfig.services.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="font-orbitron text-sm tracking-widest uppercase">No services listed yet</p>
            <p className="text-xs mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {commissionsConfig.services.map((service) => {
              const basePrice = service.basePrice ?? 0;
              const canRequest = service.available && commissionsConfig.isOpen && basePrice > 0;
              return (
                <div
                  key={service.id}
                  className="relative p-6 transition-all duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="font-orbitron font-bold text-lg text-white">{service.title}</h2>
                      {!service.available && (
                        <span className="text-xs font-mono text-red-400 mt-1 block">Currently unavailable</span>
                      )}
                    </div>
                    <span
                      className="shrink-0 px-3 py-1 font-orbitron font-bold text-sm"
                      style={{
                        background: 'rgba(236,72,153,0.12)',
                        border: '1px solid rgba(236,72,153,0.4)',
                        color: '#ec4899',
                        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
                      }}
                    >
                      {service.price}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed mb-5">{service.description}</p>

                  {/* Sample images */}
                  {service.sampleImages.length > 0 && (
                    <div className="flex gap-3 mb-6 flex-wrap">
                      {service.sampleImages.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`${service.title} sample ${i + 1}`}
                          className="h-28 w-28 object-cover rounded"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Request button */}
                  <button
                    onClick={() => openModal({ id: service.id, title: service.title, basePrice })}
                    disabled={!canRequest}
                    className="w-full py-3 font-orbitron font-bold text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                    style={{
                      background: canRequest ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${canRequest ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: canRequest ? '#ec4899' : '#6b7280',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                    }}
                  >
                    {!commissionsConfig.isOpen
                      ? 'Commissions Closed'
                      : !service.available
                      ? 'Currently Unavailable'
                      : basePrice <= 0
                      ? 'Price Not Set'
                      : `Request This — ${formatPrice(basePrice, 'GBP')}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Portfolio / Work Showcase */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="h-px mb-16" style={{ background: 'linear-gradient(to right, transparent, rgba(236,72,153,0.3), transparent)' }} />
        <div className="text-center mb-10">
          <p className="text-xs font-orbitron tracking-[0.34em] uppercase mb-3" style={{ color: '#a855f7' }}>Gallery</p>
          <h2 className="font-orbitron font-black text-3xl text-white">My Work</h2>
        </div>

        {commissionsConfig.portfolioImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-700">
            <ImageOff size={36} className="mb-3" />
            <p className="font-orbitron text-xs tracking-widest uppercase">Portfolio coming soon</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {commissionsConfig.portfolioImages.map((url, i) => (
              <div key={i} className="mb-4 break-inside-avoid">
                <img
                  src={url}
                  alt={`Portfolio piece ${i + 1}`}
                  className="w-full rounded transition-transform duration-300 hover:scale-[1.02]"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full max-w-lg relative"
            style={{
              background: '#0d0e12',
              border: '1px solid rgba(236,72,153,0.3)',
              clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-xs font-orbitron tracking-[0.3em] uppercase mb-1" style={{ color: '#ec4899' }}>Commission Request</p>
                <h3 className="font-orbitron font-bold text-white text-lg">{selectedService.title}</h3>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              {/* Description */}
              <div>
                <label className="block text-xs font-orbitron tracking-widest uppercase text-gray-400 mb-2">
                  Describe your request <span style={{ color: '#ec4899' }}>*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Tell me as much as you can — the more detail the better. Include references, style, size, deadline, or anything else relevant..."
                  required
                  className="w-full resize-none text-sm text-white placeholder-gray-600 bg-transparent rounded p-3 outline-none transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {/* Contact */}
              <div>
                <label className="block text-xs font-orbitron tracking-widest uppercase text-gray-400 mb-2">
                  Where can I contact you? <span style={{ color: '#ec4899' }}>*</span>
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Discord username, email address, Twitter handle…"
                  required
                  className="w-full text-sm text-white placeholder-gray-600 bg-transparent rounded p-3 outline-none transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(236,72,153,0.5)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>

              {errorMsg && (
                <p className="text-red-400 text-xs font-mono">{errorMsg}</p>
              )}

              {/* Price summary */}
              <div className="flex items-center justify-between py-3 border-t border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="text-xs font-orbitron uppercase tracking-widest text-gray-500">Total</span>
                <span className="font-orbitron font-bold text-white">{formatPrice(selectedService.basePrice, 'GBP')}</span>
              </div>

              <button
                type="submit"
                disabled={submitting || !description.trim() || !contact.trim()}
                className="py-3 font-orbitron font-bold text-sm tracking-widest uppercase transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(236,72,153,0.15)',
                  border: '1px solid rgba(236,72,153,0.5)',
                  color: '#ec4899',
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                }}
              >
                {submitting ? 'Redirecting to checkout…' : `Pay & Submit — ${formatPrice(selectedService.basePrice, 'GBP')}`}
              </button>
              <p className="text-center text-xs text-gray-600">Secure payment via Stripe. Your details are saved with the payment.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Commissions;
