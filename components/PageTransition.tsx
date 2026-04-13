import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const LOGO_URL = 'https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg';

const PAGE_NAMES: Record<string, string> = {
  '/': 'Website',
  '/posts': 'Posts',
  '/profile': 'Profile',
  '/membership': 'Membership',
  '/donate': 'Donation',
  '/donate/success': 'Donation',
  '/store': 'Store',
  '/download': 'Download',
  '/messages': 'Messages',
};

interface Overlay {
  name: string;
  fadingOut: boolean;
}

const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const prevPath = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Skip on initial mount — initial load is handled by the HTML loading screen
    if (prevPath.current === null) {
      prevPath.current = location.pathname;
      return;
    }
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    const path = location.pathname;
    const name = PAGE_NAMES[path] ?? (path.startsWith('/store/') ? 'Store' : 'Website');

    // Clear any in-progress transition
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setOverlay({ name, fadingOut: false });

    // Show overlay for 400ms, then fade out over 350ms
    const t1 = setTimeout(() => {
      setOverlay(prev => prev ? { ...prev, fadingOut: true } : null);
      const t2 = setTimeout(() => setOverlay(null), 350);
      timers.current.push(t2);
    }, 400);
    timers.current.push(t1);

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [location.pathname]);

  return (
    <>
      {children}
      {overlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#0d0e12',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            opacity: overlay.fadingOut ? 0 : 1,
            transition: overlay.fadingOut ? 'opacity 0.35s ease' : 'opacity 0.15s ease',
            pointerEvents: overlay.fadingOut ? 'none' : 'all',
          }}
        >
          <img
            src={LOGO_URL}
            alt="WahajPlayz"
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(0,212,255,0.5)',
              animation: 'logo-pulse 2s ease-in-out infinite',
            }}
          />
          <p
            style={{
              margin: '28px 0 0',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'rgba(0,212,255,0.7)',
              textTransform: 'uppercase',
            }}
          >
            Loading up
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 22,
              fontWeight: 900,
              color: '#ffffff',
              textShadow: '0 0 12px rgba(0,212,255,0.7), 0 0 30px rgba(0,212,255,0.3)',
              letterSpacing: '0.05em',
            }}
          >
            {overlay.name}
          </p>
          <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#00d4ff',
                  display: 'block',
                  animation: `dot-blink 1.2s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default PageTransition;
