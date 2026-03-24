import React from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const socialLinks = [
  { href: 'https://www.youtube.com/@WahajPlayz20', label: 'YouTube', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>, hoverBg: 'rgba(255,0,0,0.15)', hoverBorder: 'rgba(255,0,0,0.4)' },
  { href: 'https://www.tiktok.com/@wahajplayzgames', label: 'TikTok', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>, hoverBg: 'rgba(236,72,153,0.15)', hoverBorder: 'rgba(236,72,153,0.4)' },
  { href: 'https://discord.com/invite/JMgSaKj6st', label: 'Discord', icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>, hoverBg: 'rgba(88,101,242,0.15)', hoverBorder: 'rgba(88,101,242,0.4)' },
];

const Footer: React.FC = () => {
  const navigate = useNavigate();

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
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className="p-3 text-gray-500 hover:text-white transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = s.hoverBg; (e.currentTarget as HTMLAnchorElement).style.borderColor = s.hoverBorder; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                {s.icon}
              </a>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={() => navigate('/donate')}
              className="flex items-center gap-2 px-6 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
              <Heart size={14} fill="currentColor" />
              Support
            </button>
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
