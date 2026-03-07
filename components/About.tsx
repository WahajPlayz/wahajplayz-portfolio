import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const About: React.FC = () => {
  const { openMemberPanel } = useData();
  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 20) {
      openMemberPanel();
      setClickCount(0);
    }
  };

  return (
    <section id="about" className="py-24 relative overflow-hidden scanline-overlay" style={{ backgroundColor: '#0d0e12' }}>
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-16">
          <div className="h-px flex-1 max-w-12" style={{ background: '#00d4ff' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#00d4ff' }}>// ABOUT ME</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #00d4ff, transparent)' }} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="font-orbitron font-black mb-8 leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              HI! I'M <span className="neon-cyan">WAHAJ</span>.
            </h2>

            <div className="space-y-5 text-gray-400 text-base leading-relaxed">
              <p>
                I'm a game developer and a passionate gamer. I originally started my YouTube channel to create gaming content,
                but everything changed when I came across a devlog for a platformer I really enjoyed.
              </p>
              <p>
                Watching how the game was built from the ground up inspired me to start my own project.
                That's how <strong className="text-white">Mecha Overdrive</strong> was born—a first-person shooter I'm developing from scratch.
              </p>
              <p>
                I also recently started a new project called <strong className="text-white">Monde Miraculous: Kwami Create</strong>.
                You can see more details in my Discord server.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[['2+', 'PROJECTS'], ['100+', 'HOURS CODED'], ['∞', 'PASSION']].map(([val, label]) => (
                <div key={label} className="p-4 border text-center"
                  style={{ borderColor: 'rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.03)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                  <div className="font-orbitron font-black text-xl neon-cyan">{val}</div>
                  <div className="text-xs text-gray-500 tracking-wider mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="px-4 py-2 border text-sm font-mono tracking-wide"
                style={{ borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.05)' }}>
                #Unity3D
              </div>
              <div
                className="px-4 py-2 border text-sm font-mono tracking-wide cursor-default select-none active:scale-95 transition-transform"
                style={{ borderColor: 'rgba(0,212,255,0.4)', color: '#00d4ff', background: 'rgba(0,212,255,0.05)' }}
                onClick={handleSecretClick}
              >
                #IndieDev
              </div>
              <div className="px-4 py-2 border text-sm font-mono tracking-wide"
                style={{ borderColor: 'rgba(59,130,246,0.4)', color: '#60a5fa', background: 'rgba(59,130,246,0.05)' }}>
                #ContentCreator
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative group w-full max-w-md aspect-square">
              {/* Neon glow border */}
              <div className="absolute -inset-px pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.4), rgba(168,85,247,0.4))', clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)' }} />
              <div className="absolute inset-0.5 overflow-hidden"
                style={{ clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)' }}>
                <img
                  src="https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg"
                  alt="WahajPlayz Setup"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 scale-100"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
                <div className="absolute bottom-6 left-6">
                  <p className="font-orbitron font-bold text-white text-sm tracking-wider">HEADQUARTERS</p>
                  <p className="text-gray-400 text-xs mt-1">Where the magic happens</p>
                </div>
                {/* Corner accent */}
                <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2" style={{ borderColor: '#00d4ff' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
