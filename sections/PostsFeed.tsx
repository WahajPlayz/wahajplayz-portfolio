import React, { useState } from 'react';
import { Lock, Pin, ArrowRight, X, Gem } from 'lucide-react';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { useUserMemberships } from '@/hooks/useUserMemberships';
import { useNavigate } from 'react-router-dom';

const PostsFeed: React.FC = () => {
  const { config } = useSupportData();
  const { user, openAuthModal } = useAuth();
  const { hasAnyTier } = useUserMemberships();
  const navigate = useNavigate();
  const [modal, setModal] = useState<typeof config.posts[0] | null>(null);

  const posts = [...config.posts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }).slice(0, 4);

  const canView = (post: typeof config.posts[0]) => {
    if (post.visibility === 'public') return true;
    if (!user) return false;
    if (post.visibility === 'members') return true;
    if (post.visibility === 'tier-specific') return hasAnyTier(post.allowedTiers || []);
    return true;
  };

  const getLockLabel = (post: typeof config.posts[0]) => {
    if (post.visibility === 'tier-specific') {
      const names = (post.allowedTiers || [])
        .map(id => config.membership.tiers.find(t => t.id === id)?.name)
        .filter(Boolean)
        .join(' / ');
      return names ? `${names} only` : 'Tier members only';
    }
    return 'Members only';
  };

  const handleOpen = (post: typeof config.posts[0]) => {
    if (!canView(post)) {
      if (!user) { openAuthModal(); return; }
      navigate('/membership');
      return;
    }
    setModal(post);
  };

  return (
    <section id="posts" className="relative py-24 overflow-hidden" style={{ background: '#080810' }}>
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="font-mono text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>// LATEST UPDATES</p>
          <h2 className="font-orbitron font-black text-4xl md:text-5xl mb-6">
            <span className="text-white">POSTS &amp;</span>{' '}
            <span style={{ color: '#00d4ff', textShadow: '0 0 30px rgba(0,212,255,0.5)' }}>DEVLOGS</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {posts.map(post => {
            const viewable = canView(post);
            return (
              <div key={post.id} onClick={() => handleOpen(post)}
                className="relative p-6 cursor-pointer transition-all hover:-translate-y-1 group"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,212,255,0.1)', clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)' }}>
                {!viewable && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2"
                    style={{ background: 'rgba(13,14,18,0.75)', backdropFilter: 'blur(4px)', clipPath: 'inherit' }}>
                    <Lock size={20} style={{ color: '#a855f7' }} />
                    <span className="font-orbitron text-xs text-white text-center px-4">{getLockLabel(post)}</span>
                    <button
                      onClick={e => { e.stopPropagation(); user ? navigate('/membership') : openAuthModal(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 font-orbitron text-xs font-bold tracking-wider uppercase mt-1 transition-all hover:scale-105"
                      style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.5)', color: '#a855f7' }}>
                      <Gem size={11} /> {user ? 'Upgrade' : 'Join to unlock'}
                    </button>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.pinned && <Pin size={12} style={{ color: '#00d4ff' }} />}
                    <span className="font-mono text-xs px-2 py-0.5"
                      style={{
                        background: post.visibility === 'public' ? 'rgba(0,212,255,0.1)' : post.visibility === 'tier-specific' ? 'rgba(251,191,36,0.12)' : 'rgba(168,85,247,0.15)',
                        color: post.visibility === 'public' ? '#00d4ff' : post.visibility === 'tier-specific' ? '#fbbf24' : '#a855f7',
                      }}>
                      {post.visibility === 'tier-specific' ? getLockLabel(post) : post.visibility}
                    </span>
                    {post.tags && post.tags.map(tag => (
                      <span key={tag} className="font-mono text-xs text-gray-600">#{tag}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-xs font-mono flex-shrink-0">
                    {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-orbitron font-bold text-base mb-2 text-white group-hover:text-cyan-300 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2">{post.excerpt}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <a href="#/posts"
            className="inline-flex items-center gap-2 px-6 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
            View All Posts <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[9980] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-8 relative"
            style={{ background: '#0d0e12', border: '1px solid rgba(0,212,255,0.3)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-600 hover:text-white"><X size={20} /></button>
            {modal.coverImage && <img src={modal.coverImage} alt={modal.title} className="w-full rounded mb-6 object-cover max-h-64" />}
            <p className="text-gray-600 text-xs font-mono mb-2">{new Date(modal.publishedAt).toLocaleDateString()}</p>
            <h2 className="font-orbitron font-bold text-2xl mb-6 text-white">{modal.title}</h2>
            <div className="text-gray-300 text-sm leading-relaxed prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: modal.content }} />
          </div>
        </div>
      )}
    </section>
  );
};

export default PostsFeed;
