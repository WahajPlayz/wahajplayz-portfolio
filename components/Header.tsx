import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const HEADER_LOGO_URL = 'https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg';
const HEADER_LOGO_FALLBACK = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#06101a"/>
        <stop offset="100%" stop-color="#221130"/>
      </linearGradient>
      <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bg)"/>
    <circle cx="80" cy="80" r="74" fill="none" stroke="url(#ring)" stroke-width="4"/>
    <text x="80" y="92" text-anchor="middle" fill="#ffffff" font-family="Orbitron, Arial, sans-serif" font-size="48" font-weight="700">W</text>
  </svg>`
)}`;

const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'About', href: '#about' },
  { name: 'Creations', href: '#creations' },
  { name: 'Roadmap', href: '#roadmap' },
  { name: 'Experience', href: '#experience' },
  { name: 'Community', href: '#community' },
  { name: 'FAQ', href: '#faq' },
];

const Header: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState(HEADER_LOGO_URL);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    // Check if window exists (SSR safety) though mainly for client-side here
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Initialize state
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without jumping
        window.history.pushState(null, '', href);
      } else {
        console.warn(`Element with id ${href} not found`);
      }
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'backdrop-blur-xl py-3'
          : 'bg-transparent py-5'
      }`}
      style={isScrolled ? { background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(0,212,255,0.15)' } : {}}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, '#home')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src={logoSrc}
            alt="WahajPlayz"
            onError={() => setLogoSrc(HEADER_LOGO_FALLBACK)}
            className="h-10 w-10 object-contain rounded-full"
            style={{ boxShadow: '0 0 12px rgba(0,212,255,0.4)' }}
          />
          <span className="font-orbitron font-bold text-sm tracking-widest hidden sm:block" style={{ color: '#00d4ff' }}>WAHAJPLAYZ</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-xs font-orbitron font-bold tracking-widest uppercase text-gray-400 hover:text-white transition-colors relative group py-2"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-px transition-all duration-300 group-hover:w-full" style={{ background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }}></span>
            </a>
          ))}
        </nav>

        {/* Account / CTA */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <a
              href="#/profile"
              className="px-4 py-2 font-orbitron font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-5 h-5 rounded-full" />
              ) : (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-[10px]">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
              )}
              Profile
            </a>
          ) : (
            <button
              onClick={() => openAuthModal()}
              className="px-4 py-2 font-orbitron font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:scale-105"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
            >
              Sign In
            </button>
          )}
          <a
            href="https://discord.gg/KF9cMSZ2hW"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 font-orbitron font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:scale-105 flex items-center gap-2"
            style={{ background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.5)', color: '#7289da', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>
            JOIN DISCORD
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 border transition-colors"
          style={{ borderColor: 'rgba(0,212,255,0.3)', color: '#00d4ff' }}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full backdrop-blur-xl p-6 flex flex-col space-y-2"
          style={{ background: 'rgba(0,0,0,0.95)', borderBottom: '1px solid rgba(0,212,255,0.15)' }}>
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="font-orbitron text-xs tracking-widest uppercase text-gray-400 hover:text-white py-3 border-b transition-colors"
              style={{ borderColor: 'rgba(0,212,255,0.1)' }}
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.name}
            </a>
          ))}
          {user ? (
            <a
              href="#/profile"
              className="font-orbitron text-xs tracking-widest uppercase text-cyan-300 hover:text-white py-3 border-b transition-colors flex items-center gap-2"
              style={{ borderColor: 'rgba(0,212,255,0.1)' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Profile'} className="w-5 h-5 rounded-full" />
              ) : (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-[10px]">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
              )}
              Profile
            </a>
          ) : (
            <button
              className="text-left font-orbitron text-xs tracking-widest uppercase text-cyan-300 hover:text-white py-3 border-b transition-colors"
              style={{ borderColor: 'rgba(0,212,255,0.1)' }}
              onClick={() => { setMobileMenuOpen(false); openAuthModal(); }}
            >
              Sign In
            </button>
          )}
          <a
            href="https://discord.gg/KF9cMSZ2hW"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-center font-orbitron font-bold text-xs tracking-widest uppercase py-3 transition-all"
            style={{ background: 'rgba(88,101,242,0.2)', border: '1px solid rgba(88,101,242,0.5)', color: '#7289da' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            JOIN DISCORD
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;
