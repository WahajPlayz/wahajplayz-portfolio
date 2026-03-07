import React from 'react';
import { Project } from '../types';
import { Play, MessageCircle } from 'lucide-react';

const projects: Project[] = [
  {
    id: 'mecha-overdrive',
    title: 'Mecha Overdrive',
    tag: 'First-Person Shooter',
    description: 'A high-octane FPS being developed from scratch. Documenting the journey from code to release.',
    imageUrl: 'https://image2url.com/images/1764855543160-074ff442-e58e-47eb-a026-9edc9e532f4d.png',
    link: 'https://www.youtube.com/@WahajPlayz20',
    buttonText: 'Watch Devlogs',
  },
  {
    id: 'monde-miraculous',
    title: 'Monde Miraculous',
    tag: 'Modding Project',
    description: 'A revolutionary project integrating Create Mod tech with custom Miraculous powers.',
    imageUrl: 'https://image2url.com/images/1764416647328-67a1a780-b5d8-4d42-8ed6-46404d219063.png',
    link: 'https://discord.com/invite/JMgSaKj6st',
    buttonText: 'Join Discord',
  }
];

const Creations: React.FC = () => {
  return (
    <section id="creations" className="py-24 relative overflow-hidden" style={{ backgroundColor: '#0d0e12' }}>
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12" style={{ background: '#a855f7' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#a855f7' }}>// PROJECTS</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #a855f7, transparent)' }} />
        </div>
        <div className="mb-16">
          <h2 className="font-orbitron font-black text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            EXPLORE MY <span className="neon-purple">CREATIONS</span>
          </h2>
          <p className="text-gray-500 max-w-2xl">Games, mods, and tools built with passion and code.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className="group relative h-[420px] w-full overflow-hidden transition-all duration-500"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)',
                border: '1px solid rgba(168,85,247,0.2)',
                background: '#050508',
              }}
            >
              {/* Hover neon border effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ boxShadow: 'inset 0 0 40px rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.5)' }} />

              {/* Background image */}
              <img
                src={project.imageUrl}
                alt={project.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-50 group-hover:opacity-35"
              />

              {/* Gradient */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)' }} />

              {/* Corner decoration */}
              <div className="absolute top-0 right-0 w-10 h-10 border-r-2 border-t-2 opacity-60"
                style={{ borderColor: i === 0 ? '#00d4ff' : '#a855f7' }} />

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3 py-1 text-xs font-orbitron font-bold tracking-widest uppercase mb-4"
                    style={{ border: `1px solid ${i === 0 ? 'rgba(0,212,255,0.4)' : 'rgba(168,85,247,0.4)'}`, color: i === 0 ? '#00d4ff' : '#a855f7', background: `rgba(${i === 0 ? '0,212,255' : '168,85,247'},0.08)` }}>
                    {project.tag}
                  </span>
                  <h3 className="font-orbitron font-black text-white uppercase leading-none" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
                    {project.title}
                  </h3>
                </div>

                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-400">
                  <p className="text-gray-400 mb-6 text-sm leading-relaxed">{project.description}</p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all duration-300 hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${i === 0 ? '#00d4ff, #a855f7' : '#a855f7, #ec4899'})`,
                      color: '#000',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                      boxShadow: `0 0 20px rgba(${i === 0 ? '0,212,255' : '168,85,247'},0.3)`,
                    }}
                  >
                    {project.title.includes('Mecha') ? <Play size={14} fill="currentColor" /> : <MessageCircle size={14} />}
                    {project.buttonText}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Creations;