import React, { useState } from 'react';
import { Search, Lock, Pin, ArrowLeft, Gem } from 'lucide-react';
import { useSupportData } from '@/context/SupportContext';
import { useAuth } from '@/context/AuthContext';
import { useUserMemberships } from '@/hooks/useUserMemberships';
import { useNavigate } from 'react-router-dom';

type Filter = 'all' | 'public' | 'members' | 'pinned';

const PostsPage: React.FC = () => {
  const { config } = useSupportData();
  const { user, openAuthModal } = useAuth();
  const { hasAnyTier } = useUserMemberships();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [modal, setModal] = useState<typeof config.posts[0] | null>(null);

  const allTags = Array.from(new Set(config.posts.flatMap(p => p.tags || [])));

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
        .join(', ');
      return names ? `${names} members only` : 'Tier members only';
    }
    return 'Members only';
  };

  const filtered = config.posts
    .filter(p => filter === 'all' || (filter === 'pinned' ? p.pinned : p.visibility === filter))
    .filter(p => !activeTag || (p.tags && p.tags.includes(activeTag)))
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#0d0e12' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-10">
          <a href="#/" className="inline-flex items-center gap-2 text-gray-600 hover:text-white font-mono text-xs transition-colors mb-6">
            <ArrowLeft size={14} /> Back to Home
          </a>
          <h1 className="font-orbitron font-black text-4xl" style={{ color: '#00d4ff' }}>POSTS &amp; DEVLOGS</h1>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-transparent font-mono text-sm outline-none"
            style={{ border: '1px solid rgba(0,212,255,0.2)', color: '#fff' }} />
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'public', 'members', 'pinned'] as Filter[]).map(f => (
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
          {filtered.length === 0 && (
            <p className="text-gray-600 text-center font-mono py-16">No posts found.</p>
          )}
          {filtered.map(post => {
            const viewable = canView(post);
            return (
              <div key={post.id}
                onClick={() => viewable ? setModal(post) : (user ? null : openAuthModal())}
                className="relative p-6 transition-all hover:-translate-y-0.5 group"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(0,212,255,0.1)',
                  clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                  cursor: viewable ? 'pointer' : 'default',
                }}>
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
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/membership'); }}
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

      {modal && (
        <div className="fixed inset-0 z-[9980] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-8 relative"
            style={{ background: '#0d0e12', border: '1px solid rgba(0,212,255,0.3)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-600 hover:text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <p className="text-gray-600 text-xs font-mono mb-2">{new Date(modal.publishedAt).toLocaleDateString()}</p>
            <h2 className="font-orbitron font-bold text-2xl mb-6 text-white">{modal.title}</h2>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{modal.content}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostsPage;
