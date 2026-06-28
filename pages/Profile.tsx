import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, CreditCard, Link2, LogOut, Newspaper, Unlink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { redirectToDiscordOAuth } from '@/lib/discord';
import { openMembershipBillingPortal, verifyMembershipCheckout } from '@/lib/stripeCheckout';
import { useUserMemberships } from '@/hooks/useUserMemberships';

const formatLabel = (value: string) => value
  .replace(/[-_]/g, ' ')
  .replace(/\b\w/g, char => char.toUpperCase());

const ProfilePage: React.FC = () => {
  const { user, signOutFirebase } = useAuth();
  const { discordUser, discordLogout } = useData();
  const { memberships, loading: membershipLoading } = useUserMemberships();
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [billingPortalError, setBillingPortalError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkoutId = params.get('checkout_id');
    if (!checkoutId) return;

    let cancelled = false;
    setVerifying(true);
    setVerifyError('');
    verifyMembershipCheckout(checkoutId)
      .catch((error) => {
        if (!cancelled) setVerifyError(error instanceof Error ? error.message : 'Failed to confirm membership.');
      })
      .finally(() => {
        if (cancelled) return;
        setVerifying(false);
        // Clear the URL param so a refresh doesn't re-verify
        const url = new URL(window.location.href);
        const hashUrl = new URL('http://x/' + url.hash.slice(1));
        hashUrl.searchParams.delete('checkout_id');
        url.hash = '#' + hashUrl.pathname + (hashUrl.search ? hashUrl.search : '');
        window.history.replaceState({}, '', url.toString());
      });

    return () => { cancelled = true; };
  }, [location.search]);

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

  const handleManageMembership = async () => {
    setBillingPortalError('');
    setBillingPortalLoading(true);
    try {
      await openMembershipBillingPortal(activeMembership?.subscriptionId ?? undefined);
    } catch (error) {
      setBillingPortalError(error instanceof Error ? error.message : 'Failed to open subscription portal.');
      setBillingPortalLoading(false);
    }
  };

  const avatarUrl = discordUser && discordUser.avatar
    ? 'https://cdn.discordapp.com/avatars/' + discordUser.id + '/' + discordUser.avatar + '.png?size=64'
    : null;

  const membershipList = Object.values(memberships);
  const providerLabel = user.app_metadata?.provider || user.user_metadata?.iss || 'google';
  const activeMembership = useMemo(() => membershipList.find((item) => item.status === 'active') ?? membershipList[0] ?? null, [membershipList]);
  const canManageSubscription = !!activeMembership?.subscriptionId;
  const hasActiveMembership = membershipList.some((item) => item.status === 'active');
  const needsDiscordLink = hasActiveMembership && !discordUser;

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

        {needsDiscordLink && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 mb-6 font-mono text-xs"
            style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.35)', color: '#c7d2fe' }}>
            <div>
              <p className="font-orbitron text-sm" style={{ color: '#5865f2' }}>CLAIM YOUR DISCORD ROLE</p>
              <p className="text-gray-400 mt-1">Connect your Discord account and we'll assign your member role on the server automatically.</p>
            </div>
            <button onClick={redirectToDiscordOAuth}
              className="flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105 self-start sm:self-auto"
              style={{ background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.5)', color: '#5865f2' }}>
              <Link2 size={14} /> Connect Discord
            </button>
          </div>
        )}

        {verifying && (
          <div className="flex items-center gap-3 p-4 mb-6 font-mono text-xs"
            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', color: '#d8b4fe' }}>
            <div className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            Activating your membership...
          </div>
        )}
        {verifyError && (
          <div className="p-4 mb-6 font-mono text-xs"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
            {verifyError}
          </div>
        )}

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

        <div className="p-6 mb-6" style={{ background: 'rgba(88,101,242,0.05)', border: '1px solid rgba(88,101,242,0.2)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
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

        <div className="p-6" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
          <h2 className="font-orbitron font-bold text-sm mb-4" style={{ color: '#a855f7' }}>MEMBERSHIP</h2>
          {membershipLoading ? (
            <p className="text-gray-500 text-xs mb-4">Checking your membership status...</p>
          ) : activeMembership ? (
            <>
              <div className="rounded-xl border border-purple-500/20 bg-black/20 p-4 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Access</p>
                <p className="font-orbitron text-white text-lg">{formatLabel(activeMembership.tierId)}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Status: <span className="text-white">{formatLabel(activeMembership.status)}</span>
                  {' '}· Billing: <span className="text-white">{formatLabel(activeMembership.billing)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="#/posts"
                  className="inline-flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}>
                  <Newspaper size={14} /> Member Posts
                </a>
                {canManageSubscription && (
                  <button
                    onClick={handleManageMembership}
                    disabled={billingPortalLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}
                  >
                    <CreditCard size={14} /> {billingPortalLoading ? 'Opening Billing Portal' : 'Manage Subscription'}
                  </button>
                )}
              </div>
              {billingPortalError && <p className="text-red-400 text-xs mt-4">{billingPortalError}</p>}
            </>
          ) : (
            <>
              <div className="rounded-xl border border-purple-500/20 bg-black/20 p-4 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Access</p>
                <p className="font-orbitron text-white text-lg">Free Supporter</p>
                <p className="text-gray-400 text-xs mt-1">Upgrade to unlock exclusive member content and support the mission.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href="#/membership"
                  className="inline-flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
                  Upgrade Membership
                </a>
                <a href="#/posts"
                  className="inline-flex items-center gap-2 px-4 py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}>
                  <Newspaper size={14} /> View Posts
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
