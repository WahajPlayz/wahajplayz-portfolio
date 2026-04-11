import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, MessageSquare, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ensureAuth, getAuthToken, FUNCTIONS_URL } from '@/lib/supabase';

interface Message { id: string; text: string; senderRole: 'owner' | 'buyer'; senderName: string; createdAt: number; }
interface Conversation { id: string; orderId: string; productNames: string[]; lastMessage: string; lastMessageAt: number; unreadBuyer: number; }

const getToken = async () => {
  await ensureAuth();
  return (await getAuthToken()) || '';
};

const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadConversations();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_URL}/messages-conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setConversations(data.conversations || []);
    } finally { setLoading(false); }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setMessages([]);
    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_URL}/messages-thread?conversationId=${conv.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMessages(data.messages || []);
      // Mark read
      await fetch(`${FUNCTIONS_URL}/messages-conversations`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: conv.id, role: 'buyer' }),
      });
      setConversations(c => c.map(x => x.id === conv.id ? { ...x, unreadBuyer: 0 } : x));
    } catch { /* ignore */ }
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const token = await getToken();
      await fetch(`${FUNCTIONS_URL}/messages-send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConv.id, text: reply.trim(), senderRole: 'buyer' }),
      });
      setMessages(m => [...m, { id: Date.now().toString(), text: reply.trim(), senderRole: 'buyer', senderName: 'You', createdAt: Date.now() }]);
      setReply('');
    } finally { setSending(false); }
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div className="relative pt-28 pb-8 overflow-hidden" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs mb-6">
            <ArrowLeft size={14} /> Back to Home
          </button>
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: '#00d4ff' }}>// MESSAGES</p>
          <h1 className="font-orbitron font-black text-3xl text-white">Your Messages</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {!user ? (
          <div className="text-center py-20">
            <MessageSquare size={48} className="mx-auto mb-4 text-gray-700" />
            <p className="font-orbitron font-bold text-white mb-2">Sign in to view messages</p>
            <p className="font-mono text-xs text-gray-500 mb-6">You need to be logged in with Google to see your order messages.</p>
            <button onClick={openAuthModal} className="font-orbitron font-bold text-xs tracking-widest uppercase px-6 py-3 transition-all hover:scale-105"
              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <p className="font-mono text-sm text-gray-500 text-center py-20">Loading messages...</p>
        ) : (
          <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[600px]">
            {/* Conversation list */}
            <div className="overflow-y-auto space-y-1" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
              {conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <Package size={32} className="mx-auto mb-3 text-gray-700" />
                  <p className="font-mono text-xs text-gray-600">No messages yet.</p>
                </div>
              ) : conversations.map(conv => (
                <button key={conv.id} onClick={() => openConversation(conv)}
                  className="w-full text-left p-4 transition-colors hover:bg-white/5"
                  style={{ background: activeConv?.id === conv.id ? 'rgba(0,212,255,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-orbitron font-bold text-xs text-white truncate">{conv.productNames?.[0] || 'Order'}</p>
                    {conv.unreadBuyer > 0 && (
                      <span className="flex-shrink-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: '#00d4ff', color: '#000' }}>{conv.unreadBuyer}</span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-gray-600 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  <p className="font-mono text-[10px] text-gray-700 mt-1">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
                </button>
              ))}
            </div>

            {/* Thread */}
            {activeConv ? (
              <div className="flex flex-col" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="font-orbitron font-bold text-sm text-white">{activeConv.productNames?.[0] || 'Order'}</p>
                  <p className="font-mono text-xs text-gray-600 mt-0.5">Order #{activeConv.orderId.slice(-8)}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.senderRole === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        <p className="font-mono text-[10px] mb-1" style={{ color: m.senderRole === 'buyer' ? '#00d4ff' : '#a855f7', textAlign: m.senderRole === 'buyer' ? 'right' : 'left' }}>{m.senderName}</p>
                        <div className="px-4 py-2.5 font-mono text-sm leading-relaxed"
                          style={m.senderRole === 'buyer'
                            ? { background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', color: '#e5e7eb' }
                            : { background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#e5e7eb' }}>
                          {m.text}
                        </div>
                        <p className="font-mono text-[10px] text-gray-700 mt-1" style={{ textAlign: m.senderRole === 'buyer' ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 flex gap-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder="Type a message..." className="flex-1 px-3 py-2 bg-black/40 border border-white/10 text-white font-mono text-sm outline-none focus:border-cyan-500/50" />
                  <button onClick={sendReply} disabled={!reply.trim() || sending}
                    className="px-4 py-2 flex items-center gap-2 font-orbitron font-bold text-xs tracking-wider transition-all hover:scale-105 disabled:opacity-40"
                    style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}>
                    <Send size={13} /> {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-center">
                  <MessageSquare size={36} className="mx-auto mb-3 text-gray-700" />
                  <p className="font-mono text-xs text-gray-600">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
