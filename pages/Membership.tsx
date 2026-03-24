import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GoalBar from '@/components/GoalBar';
import MembershipTiers from '@/components/MembershipTiers';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';

const MembershipPage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useSupportData();
  const { user } = useAuth();
  const { membershipPage, posts } = config;

  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(null);

  const visiblePosts = posts.filter(p => p.visibility === 'public' || p.visibility === 'members');
  const sorted = [...visiblePosts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const canRead = (post: typeof posts[0]) => {
    if (post.visibility === 'public') return true;
    if (post.visibility === 'members' && user) return true;
    return false;
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      {/* Top bar offset */}
      <div style={{ height: 48 }} />

      {/* Back link */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-white text-sm transition-colors flex items-center gap-2 mb-8"
        >
          <span>←</span> Back
        </button>
      </div>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 mb-12 text-center">
        <p className="text-xs font-orbitron tracking-widest uppercase text-purple-400 mb-4">Membership</p>
        <h1
          className="font-orbitron font-black text-4xl md:text-5xl mb-4"
          style={{ background: 'linear-gradient(135deg,#818cf8,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          {membershipPage.headline}
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">{membershipPage.subheading}</p>
      </div>

      {/* Goal bar */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <GoalBar />
      </div>

      {/* Membership tiers */}
      <div className="max-w-6xl mx-auto px-6 mb-20">
        <MembershipTiers />
      </div>

      {/* Posts & Devlogs */}
      {sorted.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <div className="mb-8">
            <p className="text-xs font-orbitron tracking-widest uppercase text-cyan-400 mb-2">Latest</p>
            <h2 className="font-orbitron font-black text-2xl text-white">Posts & Devlogs</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {sorted.map(post => {
              const readable = canRead(post);
              return (
                <div
                  key={post.id}
                  onClick={() => readable && setSelectedPost(post)}
                  className={`rounded-xl border overflow-hidden transition-all ${readable ? 'cursor-pointer hover:border-purple-500/50 hover:scale-[1.01]' : 'cursor-default'}`}
                  style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                >
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
                        {post.tags.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && setSelectedPost(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border mt-8 mb-8 overflow-hidden"
            style={{ background: '#0d0e12', borderColor: 'rgba(99,102,241,0.3)' }}
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

export default MembershipPage;
