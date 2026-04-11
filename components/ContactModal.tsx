import React, { useState } from 'react';
import { X, Send, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_STRIPE_API_BASE as string;

const ContactModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName(''); setEmail(''); setSubject(''); setMessage('');
    setSent(false); setError('');
  };

  const handleOpen = () => { reset(); setOpen(true); };
  const handleClose = () => { setOpen(false); };

  const send = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in name, email, and message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        aria-label="Contact me"
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 font-orbitron font-bold text-xs tracking-widest uppercase px-4 py-3 transition-all duration-200 hover:scale-105 shadow-lg"
        style={{
          background: 'rgba(13,14,18,0.95)',
          border: '1px solid rgba(0,212,255,0.4)',
          color: '#00d4ff',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 20px rgba(0,212,255,0.15)',
        }}
      >
        <MessageSquare size={14} />
        Contact
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="w-full max-w-lg relative"
            style={{
              background: '#0d0e12',
              border: '1px solid rgba(0,212,255,0.2)',
              clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)',
            }}
          >
            {/* Corner decoration */}
            <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none"
              style={{ background: 'rgba(0,212,255,0.15)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00d4ff' }} />
                  <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: '#00d4ff' }}>// GET IN TOUCH</span>
                </div>
                <h2 className="font-orbitron font-black text-white text-lg">Contact Me</h2>
              </div>
              <button onClick={handleClose} className="text-gray-600 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {sent ? (
                <div className="text-center py-8">
                  <CheckCircle2 size={40} className="mx-auto mb-4" style={{ color: '#00d4ff' }} />
                  <p className="font-orbitron font-bold text-white mb-2">Message Sent!</p>
                  <p className="font-mono text-xs text-gray-500 mb-6">I'll get back to you as soon as I can.</p>
                  <button
                    onClick={handleClose}
                    className="font-orbitron font-bold text-xs tracking-widest uppercase px-6 py-2.5 transition-all hover:scale-105"
                    style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Name *</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Email *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
                        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Subject</label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="What's this about?"
                      className="w-full px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">Message *</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send(); }}
                      placeholder="Say anything..."
                      rows={5}
                      className="w-full px-3 py-2.5 font-mono text-sm text-white outline-none transition-colors resize-none"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 0 }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(0,212,255,0.4)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                    <p className="font-mono text-[10px] text-gray-700 mt-1">Ctrl+Enter to send</p>
                  </div>

                  {error && (
                    <p className="font-mono text-xs text-red-400 bg-red-900/10 border border-red-900/20 px-3 py-2">{error}</p>
                  )}

                  <button
                    onClick={send}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 font-orbitron font-bold text-xs tracking-widest uppercase py-3 transition-all hover:scale-[1.01] disabled:opacity-50"
                    style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}
                  >
                    {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContactModal;
