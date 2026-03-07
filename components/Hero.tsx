import React from 'react';
import { ChevronDown } from 'lucide-react';

const DiscordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
  </svg>
);

const SocialLink: React.FC<{ href: string; hoverColor: string; children: React.ReactNode }> = ({ href, hoverColor, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`p-3 border border-white/10 bg-white/5 backdrop-blur-sm text-gray-400 hover:text-white transition-all duration-300 hover:-translate-y-1 clip-corner-sm ${hoverColor}`}
    style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
  >
    {children}
  </a>
);

const Hero: React.FC = () => {
  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 scanline-overlay">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />

      {/* Neon orbs */}
      <div className="absolute top-1/4 left-1/6 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/6 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)', animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)' }} />

      {/* Corner decorations */}
      <div className="absolute top-24 left-8 w-16 h-16 border-l-2 border-t-2 opacity-30" style={{ borderColor: '#00d4ff' }} />
      <div className="absolute top-24 right-8 w-16 h-16 border-r-2 border-t-2 opacity-30" style={{ borderColor: '#00d4ff' }} />
      <div className="absolute bottom-20 left-8 w-16 h-16 border-l-2 border-b-2 opacity-30" style={{ borderColor: '#a855f7' }} />
      <div className="absolute bottom-20 right-8 w-16 h-16 border-r-2 border-b-2 opacity-30" style={{ borderColor: '#a855f7' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Label */}
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 border text-xs font-bold tracking-widest uppercase"
          style={{ borderColor: 'rgba(0,212,255,0.4)', background: 'rgba(0,212,255,0.05)', color: '#00d4ff' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00d4ff' }} />
          Indie Developer &amp; Content Creator
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00d4ff' }} />
        </div>

        {/* Main heading */}
        <h1 className="font-orbitron font-black tracking-tight text-white mb-2 leading-none"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
          BUILDING WORLDS.
        </h1>
        <h1 className="font-orbitron font-black tracking-tight mb-8 leading-none neon-cyan"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>
          CODING DREAMS.
        </h1>

        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Indie game developer crafting high-octane experiences. Documenting the journey from concept to release.
        </p>

        {/* Social links */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <SocialLink href="https://www.youtube.com/@WahajPlayz20" hoverColor="hover:bg-red-600/20 hover:border-red-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </SocialLink>
          <SocialLink href="https://www.tiktok.com/@wahajplayzgames" hoverColor="hover:bg-pink-500/20 hover:border-pink-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
          </SocialLink>
          <SocialLink href="https://discord.com/invite/JMgSaKj6st" hoverColor="hover:bg-indigo-500/20 hover:border-indigo-500/50">
            <DiscordIcon />
          </SocialLink>
          <SocialLink href="https://www.patreon.com/cw/WahajPlayz" hoverColor="hover:bg-blue-500/20 hover:border-blue-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z" /></svg>
          </SocialLink>
          <SocialLink href="https://ko-fi.com/wahajplayz" hoverColor="hover:bg-purple-500/20 hover:border-purple-500/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.019c-.rv.025-.24-.126-.24-.126s-2.31-1.594-3.989-3.238c-1.21-1.202-1.756-2.351-1.832-3.493-.784-5.297 5.979-5.987 5.979-5.987s6.581-.006 6.398 5.789c-.028 1.155-.541 2.206-2.00 3.06z"/></svg>
          </SocialLink>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={() => scrollTo('#creations')}
            className="relative px-8 py-4 font-orbitron font-bold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105 group w-full sm:w-auto"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)', color: '#000', boxShadow: '0 0 30px rgba(0,212,255,0.4)' }}
          >
            VIEW PROJECTS
          </button>
          <button
            onClick={() => scrollTo('#about')}
            className="px-8 py-4 font-orbitron font-bold text-sm tracking-widest uppercase border transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            style={{ borderColor: 'rgba(0,212,255,0.4)', color: '#00d4ff', background: 'rgba(0,212,255,0.05)', clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            MY STORY
          </button>
        </div>

        {/* Patreon CTA */}
        <div className="flex justify-center">
          <a
            href="https://www.patreon.com/c/wahajplayz/membership"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-6 py-3 font-bold transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(0,89,255,0.15)', border: '1px solid rgba(0,89,255,0.4)', color: '#4da6ff', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z" /></svg>
            Become a Patreon Member
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <span className="text-xs font-orbitron tracking-widest" style={{ color: '#00d4ff' }}>SCROLL</span>
        <ChevronDown size={20} className="animate-bounce" style={{ color: '#00d4ff' }} />
      </div>
    </section>
  );
};

export default Hero;