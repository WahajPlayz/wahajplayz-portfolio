import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GoalBar from '@/components/GoalBar';
import DonationPanel from '@/components/DonationPanel';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';

const API_BASE = (import.meta as any).env?.VITE_STRIPE_API_BASE as string || '';

interface PublicDonor {
  id: string;
  donorName: string;
  amountGBP: number;
  message: string;
  createdAt: number;
  ownerReply: string | null;
}

const DonatePage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useSupportData();
  const { user } = useAuth();
  const { donatePage, posts } = config;

  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(null);
  const [donors, setDonors] = useState<PublicDonor[]>([]);

  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/api/donations/public`)
      .then(r => r.json())
      .then(d => setDonors(d.donors || []))
      .catch(() => {});
  }, []);


  const publicPosts = posts.filter(p => p.visibility === 'public');
  const sorted = [...publicPosts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div style={{ height: 48 }} />

      <div className="max-w-5xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-2 mb-8"
        >
          <span>←</span> Back
        </button>
      </div>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.22), transparent 65%)' }} />
          <div className="absolute right-0 top-24 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.16), transparent 65%)' }} />
        </div>

        <div className="max-w-5xl mx-auto px-6 mb-14 text-center relative z-10">
          <p className="text-xs font-orbitron tracking-[0.34em] uppercase text-pink-400 mb-4">Support</p>
          <h1
            className="font-orbitron font-black text-4xl md:text-6xl mb-5 leading-tight"
            style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            {donatePage.headline}
          </h1>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-10">{donatePage.subheading}</p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            {[
              ['Direct Impact', 'Every donation helps fund active development, art, systems work, testing, and polish.'],
              ['One-Time Support', 'Use a quick preset amount or type a custom amount before checkout.'],
              ['Message Included', 'Supporters can add a short optional note instead of just sending money silently.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border p-5" style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="font-orbitron text-sm text-white mb-2">{title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-12">
        <GoalBar />
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-20">
        <DonationPanel />
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-20">
          <div className="mb-8">
            <p className="text-xs font-orbitron tracking-[0.28em] uppercase text-pink-400 mb-2">Community</p>
            <h2 className="font-orbitron font-black text-3xl text-white">Supporter Wall</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-2xl">Messages from people who've supported this project.</p>
          </div>
          {donors.length === 0 ? (
            <div
              className="rounded-2xl border p-10 flex flex-col items-center justify-center text-center"
              style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(236,72,153,0.18)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.2),rgba(168,85,247,0.15))' }}
              >
                <span style={{ fontSize: 22 }}>💜</span>
              </div>
              <p className="font-orbitron text-sm text-white mb-1">No donations yet</p>
              <p className="text-gray-600 text-xs">Be the first to leave a message of support.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {donors.map(donor => (
                <div
                  key={donor.id}
                  className="break-inside-avoid rounded-2xl border p-5"
                  style={{ background: 'rgba(255,255,255,0.025)', borderColor: 'rgba(236,72,153,0.18)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-orbitron font-black text-sm"
                      style={{ background: 'linear-gradient(135deg,rgba(236,72,153,0.25),rgba(168,85,247,0.2))', color: '#f9a8d4' }}
                    >
                      {donor.donorName[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{donor.donorName}</p>
                      <p className="text-pink-400 font-mono text-xs">£{Number(donor.amountGBP).toFixed(2)}</p>
                    </div>
                    <span className="ml-auto text-gray-600 text-[11px] flex-shrink-0">
                      {new Date(donor.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {donor.message ? (
                    <p className="text-gray-300 text-sm leading-relaxed italic">"{donor.message}"</p>
                  ) : (
                    <p className="text-gray-600 text-xs italic">No message left.</p>
                  )}
                  {donor.ownerReply && (
                    <div className="mt-3 pl-3 border-l-2 border-cyan-500/40">
                      <p className="text-xs text-cyan-400 font-orbitron mb-1">WahajPlayz</p>
                      <p className="text-gray-400 text-xs leading-relaxed">{donor.ownerReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      {sorted.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <div className="mb-8">
            <p className="text-xs font-orbitron tracking-[0.28em] uppercase text-cyan-400 mb-2">Latest</p>
            <h2 className="font-orbitron font-black text-3xl text-white">Posts & Updates</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-2xl">Recent public updates stay attached to the donate page so supporters can see exactly what the support is helping move forward.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="rounded-xl border overflow-hidden transition-all cursor-pointer hover:border-cyan-500/50 hover:scale-[1.01]"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {post.coverImage && (
                  <img src={post.coverImage} alt={post.title} className="w-full h-36 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {post.pinned && <span className="text-cyan-400 text-xs">📌</span>}
                    <span className="text-gray-600 text-xs ml-auto">{post.publishedAt}</span>
                  </div>
                  <h3 className="font-bold text-white mb-1">{post.title}</h3>
                  <p className="text-gray-400 text-sm">{post.excerpt}</p>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPost && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && setSelectedPost(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border mt-8 mb-8 overflow-hidden"
            style={{ background: '#0d0e12', borderColor: 'rgba(0,212,255,0.3)' }}
          >
            {selectedPost.coverImage && (
              <img src={selectedPost.coverImage} alt={selectedPost.title} className="w-full h-56 object-cover" />
            )}
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-orbitron font-black text-xl text-white">{selectedPost.title}</h2>
                  <p className="text-gray-500 text-xs mt-1">{selectedPost.publishedAt}</p>
                </div>
                <button onClick={() => setSelectedPost(null)} className="text-gray-500 hover:text-white ml-4 flex-shrink-0">✕</button>
              </div>
              <div
                className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none mb-6"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />
              {selectedPost.attachments.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Downloads</p>
                  <div className="space-y-2">
                    {selectedPost.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                      >
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
        </div>
      )}
    </div>
  );
};

export default DonatePage;
