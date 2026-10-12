import React from 'react';
import { ArrowLeft, Link2, LogOut, Unlink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { redirectToDiscordOAuth } from '@/lib/discord';

const ProfilePage: React.FC = () => {
  const { user, signOutFirebase } = useAuth();
  const { discordUser, discordLogout } = useData();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0e12' }}>
        <div className="text-center">
          <p className="font-orbitron text-gray-500 mb-4">You are not signed in.</p>
          <a href="#/" className="font-orbitron text-xs text-cyan-400 hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  const handleUnlinkDiscord = () => {
    localStorage.removeItem('wahaj_skip_discord');
    discordLogout();
  };

  const avatarUrl = discordUser && discordUser.avatar
    ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64'
    : null;

  const providerLabel = user.app_metadata?.provider || user.user_metadata?.iss || 'google';
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || 'Anonymous';
  const avatarSrc = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
  const email = user.email;

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#0d0e12' }}>
      <div className="max-w-2xl mx-auto px-6">
        <a href="#/" className="inline-flex items-center gap-2 text-gray-600 hover:text-white font-mono text-xs transition-colors mb-8">
          <ArrowLeft size={14} /> Back to Home
        </a>

        <h1 className="font-orbitron font-black text-4xl mb-10" style={{ color: '#00d4ff' }}>PROFILE</h1>

        <div className="p-6 mb-6" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
          <div className="flex items-center gap-4 mb-4">
            {avatarSrc
              ? <img src={avatarSrc} alt="avatar" className="w-14 h-14 rounded-full" />
              : <div className="w-14 h-14 rounded-full flex items-center justify-center font-orbitron text-xl"
                  style={{ background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                  {(displayName || email || '?')[0].toUpperCase()}
                </div>
            }
            <div>
              <p className="font-orbitron font-bold text-white">{displayName}</p>
              <p className="text-gray-500 text-xs font-mono">{email}</p>
              <p className="text-gray-600 text-xs font-mono mt-1">via {providerLabel}</p>
            </div>
          </div>
          <button onClick={signOutFirebase}
            className="flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <div className="p-6" style={{ background: 'rgba(88,101,242,0.05)', border: '1px solid rgba(88,101,242,0.2)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
          <h2 className="font-orbitron font-bold text-sm mb-4" style={{ color: '#5865f2' }}>DISCORD</h2>
          {discordUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {avatarUrl
                  ? <img src={avatarUrl} alt="discord" className="w-10 h-10 rounded-full" />
                  : <div className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(88,101,242,0.3)', color: '#5865f2' }}>
                      {discordUser.username[0].toUpperCase()}
                    </div>
                }
                <div>
                  <p className="text-white text-sm font-semibold">{discordUser.username}</p>
                  <p className="text-gray-500 text-xs font-mono">Linked</p>
                </div>
              </div>
              <button onClick={handleUnlinkDiscord}
                className="flex items-center gap-2 px-3 py-2 font-orbitron text-xs transition-all hover:scale-105"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                <Unlink size={12} /> Unlink
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 text-xs mb-3">No Discord account linked.</p>
              <button onClick={redirectToDiscordOAuth}
                className="flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
                style={{ background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.5)', color: '#5865f2' }}>
                <Link2 size={14} /> Link Discord
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
