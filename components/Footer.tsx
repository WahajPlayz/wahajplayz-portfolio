import React from 'react';
import { useSupportData } from '../context/SupportContext';
import { ownerConfig, SocialLink as SocialLinkType } from '../config/ownerConfig';

const getIconByPlatform = (platform: SocialLinkType['platform']) => {
  switch (platform) {
    case 'youtube':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
    case 'tiktok':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>;
    case 'discord':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>;
    case 'instagram':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>;
    case 'x':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 2h3.68l-8.04 9.19L22.5 22h-7.275l-5.699-8.332L3.992 22H.31l8.603-9.84L1.5 2h7.451l5.14 7.603L18.901 2Zm-1.286 18h2.036L7.14 3.9H4.987l12.628 16.1Z"/></svg>;
    case 'twitch':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 3.5h19v12.5l-5.5 5.5h-4l-2.5 2.5H7v-2.5H2.5V3.5zm3 3v9h2.5V6.5H5.5zm5 0v9h2.5V6.5h-2.5zm5 0v9h2.5V6.5h-2.5z"/></svg>;
    case 'github':
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.92.58.11.79-.25.79-.56v-2.09c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.73-1.52-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18A10.88 10.88 0 0 1 12 6.87c.97 0 1.95.13 2.86.39 2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.24 2.75.12 3.04.73.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.38-5.25 5.67.41.36.78 1.08.78 2.17v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>;
    case 'website':
    default:
      return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z"/></svg>;
  }
};

const Footer: React.FC = () => {
  const { config } = useSupportData();
  const socialLinks = (config.socialLinks.length ? config.socialLinks : ownerConfig.socialLinks)
    .filter(link => link.enabled !== false && link.url)
    .slice(0, 8);

  return (
    <footer className="relative overflow-hidden pt-16 pb-10" style={{ background: '#0a0b0f', borderTop: '1px solid rgba(0,212,255,0.1)' }}>
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px" style={{ background: 'linear-gradient(to right, transparent, #00d4ff, transparent)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-8">
            <span className="font-orbitron font-black text-2xl tracking-widest" style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>
              WAHAJ<span className="text-white">PLAYZ</span>
            </span>
            <p className="text-gray-600 text-xs font-mono tracking-widest mt-2">// INDIE DEVELOPER & CONTENT CREATOR</p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-6 mb-10">
            {['home','about','creations','roadmap','experience','faq'].map(id => (
              <a key={id} href={`#${id}`}
                className="font-orbitron text-xs tracking-widest uppercase text-gray-600 hover:text-white transition-colors"
                onClick={(e) => { e.preventDefault(); document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' }); }}>
                {id}
              </a>
            ))}
          </nav>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {socialLinks.map((social) => {
                const hoverBgMap: Record<SocialLinkType['platform'], string> = {
                  youtube: 'rgba(255,0,0,0.15)',
                  tiktok: 'rgba(236,72,153,0.15)',
                  discord: 'rgba(88,101,242,0.15)',
                  instagram: 'rgba(244,114,182,0.15)',
                  x: 'rgba(148,163,184,0.15)',
                  twitch: 'rgba(168,85,247,0.15)',
                  github: 'rgba(100,116,139,0.15)',
                  website: 'rgba(34,211,238,0.15)',
                };
                const hoverBorderMap: Record<SocialLinkType['platform'], string> = {
                  youtube: 'rgba(255,0,0,0.4)',
                  tiktok: 'rgba(236,72,153,0.4)',
                  discord: 'rgba(88,101,242,0.4)',
                  instagram: 'rgba(244,114,182,0.4)',
                  x: 'rgba(148,163,184,0.4)',
                  twitch: 'rgba(168,85,247,0.4)',
                  github: 'rgba(100,116,139,0.4)',
                  website: 'rgba(34,211,238,0.4)',
                };
                return (
                  <a key={social.id} href={social.url} target="_blank" rel="noopener noreferrer"
                    className="p-3 text-gray-500 hover:text-white transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = hoverBgMap[social.platform]; (e.currentTarget as HTMLAnchorElement).style.borderColor = hoverBorderMap[social.platform]; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    aria-label={social.label}
                  >
                    {getIconByPlatform(social.platform)}
                  </a>
                );
              })}
            </div>
          )}

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <a href="https://discord.com/invite/JMgSaKj6st" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
              style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.4)', color: '#7289da', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              Join Discord
            </a>
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-8" style={{ background: 'linear-gradient(to right, transparent, rgba(0,212,255,0.2), transparent)' }} />

          <p className="text-gray-600 text-xs font-mono">
            © {new Date().getFullYear()} WAHAJPLAYZ. ALL RIGHTS RESERVED.
            <span className="block mt-1 opacity-50">BUILT WITH REACT + TAILWIND + FIREBASE</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
