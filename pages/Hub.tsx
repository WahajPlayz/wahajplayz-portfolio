import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, Lock, Pin, Gem, Heart, Share2, ExternalLink,
  ShoppingBag, Package, Download, X, ImageOff, Check,
} from 'lucide-react';
import GoalBar from '@/components/GoalBar';
import MembershipTiers from '@/components/MembershipTiers';
import StoreFront from '@/sections/StoreFront';
import PostsFeed from '@/sections/PostsFeed';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useStore } from '@/context/StoreContext';
import { useUserMemberships } from '@/hooks/useUserMemberships';
import { supabase } from '@/lib/supabase';
import { startCommissionCheckout, startDonationCheckout } from '@/lib/stripeCheckout';
import { POLAR_SUPPORTED_CURRENCIES } from '@/lib/polarCurrencies';

type HubTab = 'home' | 'membership' | 'posts' | 'shop' | 'commissions';
type PostFilter = 'all' | 'public' | 'members' | 'pinned';

interface HubPost {
  id: string;
  title: string;
  pinned: boolean;
  excerpt: string;
  content: string;
  coverImage: string;
  visibility: 'public' | 'members' | 'tier-specific';
  allowedTiers: string[];
  tags: string[];
  publishedAt: string;
  attachments: Array<{ id: string; filename: string; url: string; fileType: string; sizeLabel: string; displayLabel: string; minimumTier: string; }>;
}

interface PublicDonor {
  id: string;
  donorName: string;
  amountGBP: number;
  message: string;
  createdAt: number;
}

const rowToDonor = (row: Record<string, unknown>): PublicDonor => ({
  id: row.id as string,
  donorName: (row.donor_name as string) || 'Anonymous',
  amountGBP: row.amount_gbp as number,
  message: (row.message as string) || '',
  createdAt: row.created_at as number,
});

const LOGO_URL = 'https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg';
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'IDR', 'TWD', 'HUF']);
const TAB_LABELS: Record<HubTab, string> = { home: 'Home', membership: 'Membership', posts: 'Posts', shop: 'Shop', commissions: 'Commissions' };
const TAB_ORDER: HubTab[] = ['home', 'membership', 'posts', 'shop', 'commissions'];

// ─── Banner ───────────────────────────────────────────────────────────────────
const HubBanner: React.FC = () => (
  <div
    className="relative w-full overflow-hidden"
    style={{ height: 200, background: 'linear-gradient(135deg, #05080f, #120826)', border: '1px solid rgba(0,212,255,0.15)', borderBottom: 'none', borderRadius: '12px 12px 0 0' }}
  >
    <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
    <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.3), transparent)', filter: 'blur(60px)' }} />
    <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.3), transparent)', filter: 'blur(60px)' }} />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center select-none">
        <div className="flex items-center justify-center gap-3 mb-1">
          <span className="font-orbitron font-black text-4xl md:text-5xl" style={{ color: 'rgba(0,212,255,0.3)' }}>«</span>
          <h1
            className="font-orbitron font-black text-4xl md:text-6xl"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.08em' }}
          >
            WAHAJPLAYZ
          </h1>
          <span className="font-orbitron font-black text-4xl md:text-5xl" style={{ color: 'rgba(168,85,247,0.3)' }}>»</span>
        </div>
        <p className="font-mono text-xs tracking-[0.32em] uppercase" style={{ color: 'rgba(0,212,255,0.45)' }}>Indie Game Dev · Content Creator</p>
      </div>
    </div>
  </div>
);

// ─── Profile Row ──────────────────────────────────────────────────────────────
const ProfileRow: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,212,255,0.12)', borderTop: 'none', borderRadius: '0 0 12px 12px' }}
    >
      <img src={LOGO_URL} alt="WahajPlayz" className="w-14 h-14 rounded-full flex-shrink-0"
        style={{ border: '2px solid rgba(0,212,255,0.4)', boxShadow: '0 0 12px rgba(0,212,255,0.25)' }} />
      <div className="min-w-0 flex-1">
        <p className="font-orbitron font-bold text-white text-sm">WahajPlayz</p>
        <p className="text-gray-500 text-xs font-mono">@wahajplayz · Indie Game Developer</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs tracking-wider uppercase transition-all hover:scale-105"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: copied ? '#22c55e' : '#9ca3af', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
          {copied ? <><Check size={11} /> Copied!</> : <><Share2 size={11} /> Share</>}
        </button>
        <a href="https://discord.gg/KF9cMSZ2hW" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs tracking-wider uppercase transition-all hover:scale-105"
          style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.3)', color: '#7289da', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
          Discord
        </a>
      </div>
    </div>
  );
};

// ─── Slim Donation Widget ─────────────────────────────────────────────────────
const SlimDonationWidget: React.FC = () => {
  const { config } = useSupportData();
  const { currency, formatPrice, convert } = useCurrency();
  const { donation } = config;
  const baseCurrency = config.goals?.[0]?.currencyCode || 'GBP';

  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [startingCheckout, setStartingCheckout] = useState(false);

  const normalizeAmount = (value: number) => {
    const decimals = ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2;
    return Number(convert(value, baseCurrency).toFixed(decimals));
  };

  const finalAmount = custom ? parseFloat(custom) : amount;
  const amountLabel = finalAmount ? `${currency.symbol}${finalAmount.toLocaleString(undefined, {
    minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2,
    maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(currency.code) ? 0 : 2,
  })}` : null;

  const handleDonate = async () => {
    if (!finalAmount || finalAmount <= 0 || startingCheckout) return;
    setCheckoutError('');
    setStartingCheckout(true);
    try {
      await startDonationCheckout(finalAmount, currency.code, message.trim(), username.trim());
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed.');
      setStartingCheckout(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(12,13,18,0.98), rgba(9,10,14,0.99))', borderColor: 'rgba(236,72,153,0.2)' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="font-orbitron text-xs tracking-[0.28em] uppercase mb-1" style={{ color: '#ec4899' }}>Support</p>
        <h3 className="font-orbitron font-bold text-white text-sm leading-snug">Buy a Coffee for WahajPlayz</h3>
      </div>
      {/* Donate form */}
      <div className="p-5">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {donation.presetAmounts.map(p => {
            const local = normalizeAmount(p);
            return (
              <button key={p} onClick={() => { setAmount(local); setCustom(''); }}
                className="py-3 font-orbitron font-bold text-sm transition-all"
                style={amount === local && !custom
                  ? { background: 'rgba(236,72,153,0.18)', border: '1px solid rgba(236,72,153,0.6)', color: '#fff', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                {formatPrice(p, baseCurrency)}
              </button>
            );
          })}
        </div>
        <div className="mb-2 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gray-600 text-xs">{currency.code}</span>
          <input type="number" placeholder="Custom amount" value={custom}
            onChange={e => { setCustom(e.target.value); setAmount(null); }}
            className="w-full pl-14 pr-3 py-2.5 bg-transparent font-mono text-sm outline-none border"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} min="1" />
        </div>
        <input type="text" placeholder="Your name (optional)" value={username}
          onChange={e => setUsername(e.target.value)} maxLength={50}
          className="w-full px-3 py-2.5 bg-transparent font-mono text-sm outline-none mb-2 border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        <textarea placeholder="Leave a message (optional)" value={message}
          onChange={e => setMessage(e.target.value)} rows={2}
          className="w-full px-3 py-2.5 bg-transparent font-mono text-sm outline-none resize-none mb-4 border"
          style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#d1d5db' }} />
        <button onClick={handleDonate}
          disabled={!finalAmount || finalAmount <= 0 || startingCheckout}
          className="w-full flex items-center justify-center gap-2 py-3 font-orbitron font-bold text-xs tracking-[0.18em] uppercase transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.9), rgba(168,85,247,0.85))', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
          <Heart size={14} fill="currentColor" />
          {startingCheckout ? 'Opening Checkout…' : amountLabel ? `Support with ${amountLabel}` : 'Select an Amount'}
        </button>
        {checkoutError && <p className="text-red-400 text-xs mt-3 font-mono">{checkoutError}</p>}
      </div>
    </div>
  );
};

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
const TabBar: React.FC<{ active: HubTab; onChange: (t: HubTab) => void }> = ({ active, onChange }) => (
  <div className="sticky z-40 flex border-b overflow-x-auto"
    style={{ top: 0, background: 'rgba(13,14,18,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.07)' }}>
    {TAB_ORDER.map(tab => (
      <button key={tab} onClick={() => onChange(tab)}
        className="flex-shrink-0 px-5 py-3.5 font-orbitron text-xs tracking-widest uppercase transition-all whitespace-nowrap"
        style={active === tab
          ? { borderBottom: '2px solid #00d4ff', color: '#00d4ff', background: 'rgba(0,212,255,0.04)' }
          : { borderBottom: '2px solid transparent', color: '#6b7280' }}>
        {TAB_LABELS[tab]}
      </button>
    ))}
  </div>
);

// ─── Shared Post Modal ────────────────────────────────────────────────────────
const PostModal: React.FC<{ post: HubPost; onClose: () => void }> = ({ post, onClose }) => (
  <div className="fixed inset-0 z-[9980] flex items-center justify-center p-4"
    style={{ background: 'rgba(0,0,0,0.88)' }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="w-full max-w-2xl max-h-[82vh] overflow-y-auto p-8 relative"
      style={{ background: '#0d0e12', border: '1px solid rgba(0,212,255,0.3)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-white">
        <X size={20} />
      </button>
      {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full rounded mb-6 object-cover max-h-64" />}
      <p className="text-gray-600 text-xs font-mono mb-2">{new Date(post.publishedAt).toLocaleDateString()}</p>
      <h2 className="font-orbitron font-bold text-2xl mb-6 text-white">{post.title}</h2>
      <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none mb-6"
        dangerouslySetInnerHTML={{ __html: post.content }} />
      {post.attachments.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Downloads</p>
          <div className="space-y-2">
            {post.attachments.map(att => (
              <a key={att.id} href={att.url || '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">
                <span className="text-lg">📎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{att.displayLabel || att.filename}</p>
                  <p className="text-gray-500 text-xs">{att.filename} · {att.sizeLabel}</p>
                </div>
                <span className="text-cyan-400 text-xs flex-shrink-0">Download →</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

// ─── Home Tab ─────────────────────────────────────────────────────────────────
const HomeSidebar: React.FC = () => {
  const { config } = useSupportData();
  const [recentDonors, setRecentDonors] = useState<PublicDonor[]>([]);

  useEffect(() => {
    supabase.from('donations')
      .select('id, donor_name, amount_gbp, message, created_at')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setRecentDonors(data.map(row => rowToDonor(row as Record<string, unknown>))); });
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(0,212,255,0.1)' }}>
        <p className="font-orbitron text-xs tracking-[0.28em] uppercase mb-3" style={{ color: '#00d4ff' }}>About</p>
        <p className="text-gray-400 text-sm leading-relaxed">
          {config.membershipPage.subheading || 'Indie game developer and content creator — building games and sharing the journey.'}
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <a href="https://discord.gg/KF9cMSZ2hW" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs tracking-wider uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.28)', color: '#7289da' }}>
            Discord
          </a>
          <a href="#/messages"
            className="flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs tracking-wider uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.22)', color: '#00d4ff' }}>
            Messages
          </a>
        </div>
      </div>

      {recentDonors.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(236,72,153,0.1)' }}>
          <p className="font-orbitron text-xs tracking-[0.28em] uppercase mb-4" style={{ color: '#ec4899' }}>Recent Supporters</p>
          <div className="space-y-3">
            {recentDonors.map(donor => (
              <div key={donor.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-orbitron font-black text-xs"
                  style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.2),rgba(168,85,247,0.15))', color: '#f9a8d4' }}>
                  {donor.donorName[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{donor.donorName}</p>
                  {donor.message && <p className="text-gray-600 text-xs truncate italic">"{donor.message}"</p>}
                </div>
                <span className="text-pink-400 font-mono text-xs flex-shrink-0">£{Number(donor.amountGBP).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const HomeTab: React.FC = () => (
  <div className="py-6">
    <div className="mb-4">
      <GoalBar />
    </div>
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 min-w-0">
        <StoreFront />
        <PostsFeed />
      </div>
      <div className="lg:w-72 xl:w-80 shrink-0 pt-6">
        <HomeSidebar />
      </div>
    </div>
  </div>
);

// ─── Membership Tab ───────────────────────────────────────────────────────────
const MembershipTab: React.FC<{ setSelectedPost: (p: HubPost) => void }> = ({ setSelectedPost }) => {
  const { config } = useSupportData();
  const { user } = useAuth();
  const { membershipPage, posts } = config;

  const sorted = useMemo(() => [...posts]
    .filter(p => p.visibility === 'public' || p.visibility === 'members')
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }), [posts]);

  const canRead = (post: typeof posts[0]) => post.visibility === 'public' || (post.visibility === 'members' && !!user);

  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <p className="text-xs font-orbitron tracking-widest uppercase text-purple-400 mb-4">Membership</p>
        <h2 className="font-orbitron font-black text-3xl md:text-4xl mb-4"
          style={{ background: 'linear-gradient(135deg,#818cf8,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {membershipPage.headline}
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">{membershipPage.subheading}</p>
      </div>
      <div className="mb-12"><GoalBar /></div>
      <MembershipTiers />
      {sorted.length > 0 && (
        <div className="mt-16">
          <div className="mb-8">
            <p className="text-xs font-orbitron tracking-widest uppercase text-cyan-400 mb-2">Latest</p>
            <h3 className="font-orbitron font-black text-2xl text-white">Posts & Devlogs</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map(post => {
              const readable = canRead(post);
              return (
                <div key={post.id} onClick={() => readable && setSelectedPost(post as HubPost)}
                  className={`rounded-xl border overflow-hidden transition-all ${readable ? 'cursor-pointer hover:border-purple-500/50 hover:scale-[1.01]' : 'cursor-default'}`}
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  {post.coverImage && (
                    <div className="relative h-36 overflow-hidden">
                      <img src={post.coverImage} alt={post.title} className={`w-full h-full object-cover transition-all ${!readable ? 'blur-md scale-105' : ''}`} />
                      {!readable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-white text-sm font-bold font-orbitron">🔒 Members Only</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {post.pinned && <span className="text-cyan-400 text-xs">📌</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${post.visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {post.visibility === 'public' ? 'Public' : 'Members'}
                      </span>
                      <span className="text-gray-600 text-xs ml-auto">{post.publishedAt}</span>
                    </div>
                    <h3 className={`font-bold text-white mb-1 ${!readable ? 'blur-sm' : ''}`}>{post.title}</h3>
                    <p className={`text-gray-400 text-sm ${!readable ? 'blur-sm' : ''}`}>{post.excerpt}</p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {post.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Posts Tab ────────────────────────────────────────────────────────────────
const PostsTab: React.FC<{ setSelectedPost: (p: HubPost) => void; setTab: (t: HubTab) => void }> = ({ setSelectedPost, setTab }) => {
  const { config } = useSupportData();
  const { user, openAuthModal } = useAuth();
  const { hasAnyTier } = useUserMemberships();
  const [filter, setFilter] = useState<PostFilter>('all');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => Array.from(new Set(config.posts.flatMap(p => p.tags || []))), [config.posts]);

  const canView = (post: typeof config.posts[0]) => {
    if (post.visibility === 'public') return true;
    if (!user) return false;
    if (post.visibility === 'members') return true;
    if (post.visibility === 'tier-specific') return hasAnyTier(post.allowedTiers || []);
    return true;
  };

  const getLockLabel = (post: typeof config.posts[0]) => {
    if (post.visibility === 'tier-specific') {
      const names = (post.allowedTiers || []).map(id => config.membership.tiers.find(t => t.id === id)?.name).filter(Boolean).join(', ');
      return names ? `${names} members only` : 'Tier members only';
    }
    return 'Members only';
  };

  const filtered = useMemo(() => config.posts
    .filter(p => filter === 'all' || (filter === 'pinned' ? p.pinned : p.visibility === filter))
    .filter(p => !activeTag || (p.tags && p.tags.includes(activeTag)))
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }), [config.posts, filter, activeTag, search]);

  return (
    <div className="py-8 max-w-4xl">
      <div className="mb-8">
        <p className="text-xs font-orbitron tracking-[0.3em] uppercase mb-1" style={{ color: '#00d4ff' }}>// POSTS</p>
        <h2 className="font-orbitron font-black text-3xl" style={{ color: '#00d4ff' }}>Posts & Devlogs</h2>
      </div>
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-transparent font-mono text-sm outline-none"
          style={{ border: '1px solid rgba(0,212,255,0.2)', color: '#fff' }} />
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'public', 'members', 'pinned'] as PostFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all"
            style={filter === f
              ? { background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.6)', color: '#00d4ff' }
              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
            {f}
          </button>
        ))}
      </div>
      {allTags.length > 0 && (
        <div className="flex gap-2 mb-8 flex-wrap">
          {allTags.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="px-3 py-1 font-mono text-xs transition-all"
              style={activeTag === tag
                ? { background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.5)', color: '#a855f7' }
                : { border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}>
              #{tag}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-4">
        {filtered.length === 0 && <p className="text-gray-600 text-center font-mono py-16">No posts found.</p>}
        {filtered.map(post => {
          const viewable = canView(post);
          return (
            <div key={post.id} onClick={() => viewable ? setSelectedPost(post as HubPost) : (!user && openAuthModal())}
              className="relative p-6 transition-all hover:-translate-y-0.5 group"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,212,255,0.1)', clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)', cursor: viewable ? 'pointer' : 'default' }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {post.pinned && <Pin size={12} style={{ color: '#00d4ff' }} />}
                {!viewable && <Lock size={12} style={{ color: '#a855f7' }} />}
                <span className="font-mono text-xs px-2 py-0.5"
                  style={{
                    background: post.visibility === 'public' ? 'rgba(0,212,255,0.1)' : post.visibility === 'tier-specific' ? 'rgba(251,191,36,0.12)' : 'rgba(168,85,247,0.15)',
                    color: post.visibility === 'public' ? '#00d4ff' : post.visibility === 'tier-specific' ? '#fbbf24' : '#a855f7',
                  }}>
                  {post.visibility === 'tier-specific' ? getLockLabel(post) : post.visibility}
                </span>
                {post.tags && post.tags.map(tag => <span key={tag} className="text-gray-600 text-xs font-mono">#{tag}</span>)}
                <span className="ml-auto text-gray-600 text-xs font-mono">{new Date(post.publishedAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-orbitron font-bold text-base text-white group-hover:text-cyan-300 transition-colors mb-1">{post.title}</h3>
              <p className="text-gray-500 text-sm">{post.excerpt}</p>
              {!viewable && (
                <div className="mt-3">
                  <button onClick={e => { e.stopPropagation(); setTab('membership'); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs font-bold tracking-wider uppercase transition-all hover:scale-105"
                    style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
                    <Gem size={11} /> {user ? 'Upgrade Membership' : 'Join to Read'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Shop Tab ─────────────────────────────────────────────────────────────────
const ShopTab: React.FC = () => {
  const { config } = useStore();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const baseCurrency = 'GBP';
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const allCategories = useMemo(() => Array.from(new Set(config.products.filter(p => p.enabled).map(p => p.category).filter(Boolean))), [config.products]);

  const products = useMemo(() => {
    let list = config.products.filter(p => p.enabled);
    if (filter !== 'all') list = list.filter(p => p.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some((t: string) => t.toLowerCase().includes(q)));
    }
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [config.products, filter, search, sort]);

  return (
    <div className="py-8">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest mb-2" style={{ color: '#00d4ff' }}>// SHOP</p>
        <h2 className="font-orbitron font-black text-3xl md:text-4xl text-white">{(config as { storePage?: { headline?: string } }).storePage?.headline || 'Store'}</h2>
        <p className="text-gray-400 font-mono text-sm max-w-xl mt-2">{(config as { storePage?: { subheading?: string } }).storePage?.subheading || ''}</p>
      </div>
      <div className="rounded-xl border px-4 py-3 text-sm mb-6" style={{ borderColor: 'rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.06)', color: '#dfc4ff' }}>
        Select a product to view details, choose variants, and add it to your cart.
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex flex-wrap gap-2 flex-1">
          {(['all', ...allCategories]).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)}
              className="px-3 py-1.5 font-orbitron text-xs tracking-widest uppercase transition-all"
              style={filter === tab
                ? { background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.5)', color: '#00d4ff' }
                : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="pl-8 pr-4 py-2 bg-black/30 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500/50 w-40" />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
            className="px-3 py-2 bg-black/30 border border-white/10 text-gray-400 text-xs font-mono outline-none">
            <option value="featured">Featured</option>
            <option value="price-asc">Price up</option>
            <option value="price-desc">Price down</option>
          </select>
        </div>
      </div>
      {products.length === 0 ? (
        <div className="text-center py-24">
          <ShoppingBag size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="font-orbitron text-gray-600 text-sm">No products found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map(product => {
            const isOutOfStock = product.stock === 0;
            const isDigitalUnavailable = product.type === 'digital' && !product.digitalFileUrl;
            const salePercent = product.salePercent || 0;
            const effectivePrice = salePercent > 0 ? Math.round(product.price * (1 - salePercent / 100) * 100) / 100 : product.price;
            const price = formatPrice(effectivePrice, baseCurrency);
            const compareAt = salePercent > 0 ? formatPrice(product.price, baseCurrency) : null;
            return (
              <div key={product.id} className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', opacity: isOutOfStock ? 0.6 : 1 }}>
                <div className="relative h-48 bg-black/40 overflow-hidden">
                  {product.coverImage
                    ? <img src={product.coverImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={36} className="text-gray-700" /></div>}
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 font-orbitron text-xs font-bold"
                      style={product.type === 'digital' ? { background: 'rgba(168,85,247,0.85)', color: '#fff' } : { background: 'rgba(0,212,255,0.85)', color: '#000' }}>
                      {product.type === 'digital' ? <Download size={10} /> : <Package size={10} />} {product.type}
                    </span>
                  </div>
                  {compareAt && <div className="absolute top-2 right-2 px-2 py-0.5 font-orbitron text-xs font-bold" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>-{salePercent}%</div>}
                  {product.featured && !compareAt && <div className="absolute top-2 right-2 px-2 py-0.5 font-orbitron text-xs font-bold" style={{ background: 'rgba(234,179,8,0.85)', color: '#000' }}>FEATURED</div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  {product.category && <span className="text-xs font-mono mb-1 text-gray-600">{product.category}</span>}
                  <p className="font-orbitron font-bold text-sm text-white mb-1 leading-tight">{product.name}</p>
                  <p className="text-gray-500 text-xs font-mono mb-3 line-clamp-2">{product.description}</p>
                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-orbitron font-black text-xl" style={{ color: '#00d4ff' }}>{price}</span>
                      {compareAt && <span className="text-gray-600 text-sm line-through font-mono">{compareAt}</span>}
                    </div>
                    {isOutOfStock ? (
                      <div className="py-2.5 text-center text-xs font-orbitron font-bold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}>Out of Stock</div>
                    ) : (
                      <button onClick={() => navigate(`/store/${product.id}`)} disabled={isDigitalUnavailable}
                        className="w-full py-2.5 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.45)', color: '#d8b4fe', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                        <ExternalLink size={11} /> View Product
                      </button>
                    )}
                  </div>
                </div>
                {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                  <div className="px-4 pb-3 text-xs font-mono" style={{ color: '#f59e0b' }}>Only {product.stock} left</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Commissions Tab ──────────────────────────────────────────────────────────
const CommissionsTab: React.FC = () => {
  const { config } = useSupportData();
  const { commissionsConfig } = config;
  const { formatPrice, currency, convertBetween } = useCurrency();
  const { user, authLoading, openAuthModal } = useAuth();
  const [selectedService, setSelectedService] = useState<{ id: string; title: string; basePrice: number } | null>(null);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const openModal = (svc: { id: string; title: string; basePrice: number }) => { setSelectedService(svc); setDescription(''); setContact(''); setErrorMsg(''); };
  const closeModal = () => { setSelectedService(null); setErrorMsg(''); };

  const runCheckout = async (svc: { title: string; basePrice: number }, desc: string, ctc: string) => {
    const pricesByCurrency: Record<string, number> = {};
    for (const code of POLAR_SUPPORTED_CURRENCIES) {
      pricesByCurrency[code] = convertBetween(svc.basePrice, 'GBP', code);
    }
    await startCommissionCheckout(svc.title, svc.basePrice, desc, ctc, currency.code, pricesByCurrency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !contact.trim() || !selectedService) return;

    if (authLoading) {
      setErrorMsg('Sign-in is still loading. Please wait a moment and try again.');
      return;
    }

    const svc = selectedService;
    const desc = description.trim();
    const ctc = contact.trim();

    if (!user) {
      openAuthModal(() => {
        setSubmitting(true);
        setErrorMsg('');
        runCheckout(svc, desc, ctc).catch((err) => {
          setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
          setSubmitting(false);
        });
      });
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await runCheckout(svc, desc, ctc);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-12">
        <p className="text-xs font-orbitron tracking-[0.34em] uppercase mb-3" style={{ color: '#ec4899' }}>Services</p>
        <h2 className="font-orbitron font-black text-4xl sm:text-5xl mb-4" style={{ color: '#ffffff', textShadow: '0 0 40px rgba(236,72,153,0.3)' }}>
          {commissionsConfig.heading}
        </h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto leading-relaxed mb-6">{commissionsConfig.subheading}</p>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 font-orbitron font-bold text-xs tracking-widest uppercase"
          style={{ background: commissionsConfig.isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${commissionsConfig.isOpen ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`, color: commissionsConfig.isOpen ? '#22c55e' : '#ef4444', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: commissionsConfig.isOpen ? '#22c55e' : '#ef4444', boxShadow: `0 0 6px ${commissionsConfig.isOpen ? '#22c55e' : '#ef4444'}` }} />
          {commissionsConfig.isOpen ? 'Commissions Open' : 'Commissions Closed'}
        </span>
      </div>

      {commissionsConfig.services.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="font-orbitron text-sm tracking-widest uppercase">No services listed yet</p>
          <p className="text-xs mt-2">Check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 mb-20 max-w-4xl">
          {commissionsConfig.services.map(service => {
            const basePrice = service.basePrice ?? 0;
            const canRequest = service.available && commissionsConfig.isOpen && basePrice > 0;
            return (
              <div key={service.id} className="relative p-6 transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-orbitron font-bold text-lg text-white">{service.title}</h3>
                    {!service.available && <span className="text-xs font-mono text-red-400 mt-1 block">Currently unavailable</span>}
                  </div>
                  <span className="shrink-0 px-3 py-1 font-orbitron font-bold text-sm"
                    style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.4)', color: '#ec4899', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}>
                    {service.price}
                  </span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">{service.description}</p>
                {service.sampleImages.length > 0 && (
                  <div className="flex gap-3 mb-6 flex-wrap">
                    {service.sampleImages.map((url, i) => (
                      <img key={i} src={url} alt={`${service.title} sample ${i + 1}`} className="h-28 w-28 object-cover rounded"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                )}
                <button onClick={() => openModal({ id: service.id, title: service.title, basePrice })} disabled={!canRequest}
                  className="w-full py-3 font-orbitron font-bold text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                  style={{ background: canRequest ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${canRequest ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.1)'}`, color: canRequest ? '#ec4899' : '#6b7280', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
                  {!commissionsConfig.isOpen ? 'Commissions Closed' : !service.available ? 'Currently Unavailable' : basePrice <= 0 ? 'Price Not Set' : `Request This — ${formatPrice(basePrice, 'GBP')}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="h-px mb-12" style={{ background: 'linear-gradient(to right, transparent, rgba(236,72,153,0.3), transparent)' }} />
        <div className="text-center mb-10">
          <p className="text-xs font-orbitron tracking-[0.34em] uppercase mb-3" style={{ color: '#a855f7' }}>Gallery</p>
          <h3 className="font-orbitron font-black text-3xl text-white">My Work</h3>
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
                <img src={url} alt={`Portfolio ${i + 1}`} className="w-full rounded transition-transform duration-300 hover:scale-[1.02]"
                  style={{ border: '1px solid rgba(255,255,255,0.07)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg relative"
            style={{ background: '#0d0e12', border: '1px solid rgba(236,72,153,0.3)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-xs font-orbitron tracking-[0.3em] uppercase mb-1" style={{ color: '#ec4899' }}>Commission Request</p>
                <h3 className="font-orbitron font-bold text-white text-lg">{selectedService.title}</h3>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-white p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-orbitron tracking-widest uppercase text-gray-400 mb-2">Describe your request <span style={{ color: '#ec4899' }}>*</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6} required
                  placeholder="Tell me as much as you can — the more detail the better..."
                  className="w-full resize-none text-sm text-white placeholder-gray-600 bg-transparent rounded p-3 outline-none"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(236,72,153,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div>
                <label className="block text-xs font-orbitron tracking-widest uppercase text-gray-400 mb-2">Where can I contact you? <span style={{ color: '#ec4899' }}>*</span></label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} required
                  placeholder="Discord username, email address, Twitter handle…"
                  className="w-full text-sm text-white placeholder-gray-600 bg-transparent rounded p-3 outline-none"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(236,72,153,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              {errorMsg && <p className="text-red-400 text-xs font-mono">{errorMsg}</p>}
              <div className="flex items-center justify-between py-3 border-t border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <span className="text-xs font-orbitron uppercase tracking-widest text-gray-500">Total</span>
                <span className="font-orbitron font-bold text-white">{formatPrice(selectedService.basePrice, 'GBP')}</span>
              </div>
              <button type="submit" disabled={submitting || !description.trim() || !contact.trim()}
                className="py-3 font-orbitron font-bold text-sm tracking-widest uppercase transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.5)', color: '#ec4899', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
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

// ─── Hub Page ─────────────────────────────────────────────────────────────────
const HubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPost, setSelectedPost] = useState<HubPost | null>(null);

  const activeTab = (searchParams.get('tab') as HubTab) || 'home';
  const setTab = (tab: HubTab) => setSearchParams({ tab });

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div style={{ height: 48 }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <button onClick={() => navigate('/')}
          className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-2 mb-6">
          <span>←</span> Back to Home
        </button>

        {/* Hero: banner + profile | donation widget */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
          <div>
            <HubBanner />
            <ProfileRow />
          </div>
          <div>
            <SlimDonationWidget />
          </div>
        </div>
      </div>

      {/* Sticky tab bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
        <TabBar active={activeTab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'membership' && <MembershipTab setSelectedPost={setSelectedPost} />}
        {activeTab === 'posts' && <PostsTab setSelectedPost={setSelectedPost} setTab={setTab} />}
        {activeTab === 'shop' && <ShopTab />}
        {activeTab === 'commissions' && <CommissionsTab />}
      </div>

      {selectedPost && <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
  );
};

export default HubPage;
