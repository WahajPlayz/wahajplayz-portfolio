import React from 'react';
import { Code, Box, Video, Users, Zap, Terminal } from 'lucide-react';

const skills = [
  { icon: <Box size={32} />, title: "Game Development", desc: "Unity Engine, C# Programming, Level Design" },
  { icon: <Video size={32} />, title: "Content Creation", desc: "Video Editing, Devlog Production" },
  { icon: <Users size={32} />, title: "Community", desc: "Discord Management, Audience Engagement" },
  { icon: <Terminal size={32} />, title: "Project Management", desc: "Solo development & Agile workflows" },
];

const Experience: React.FC = () => {
  return (
    <section id="experience" className="py-24 relative overflow-hidden" style={{ background: '#0d0e12' }}>
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12" style={{ background: '#00d4ff' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#00d4ff' }}>// SKILLS</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #00d4ff, transparent)' }} />
        </div>
        <div className="mb-16">
          <h2 className="font-orbitron font-black text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            EXPERIENCE &amp; <span className="neon-cyan">SKILLS</span>
          </h2>
          <p className="text-gray-500">The tools and technologies I use to bring ideas to life.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="p-6 group transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(0,212,255,0.1)',
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.4)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(0,212,255,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div className="w-12 h-12 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                {skill.icon}
              </div>
              <h3 className="font-orbitron font-bold text-white text-sm tracking-wide mb-2">{skill.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{skill.desc}</p>
            </div>
          ))}
        </div>

        {/* Current Focus */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="font-orbitron font-bold text-center mb-10 text-lg tracking-widest" style={{ color: '#00d4ff' }}>// CURRENT FOCUS</h3>
          <div className="relative pl-8 space-y-10" style={{ borderLeft: '2px solid rgba(0,212,255,0.2)' }}>
            {[
              { color: '#00d4ff', title: 'Developing Mecha Overdrive', desc: 'Active development of core mechanics, enemy AI, and level design. Weekly updates on YouTube.' },
              { color: '#a855f7', title: 'Monde Miraculous Expansion', desc: 'Integrating Create Mod features and community suggestions.' },
            ].map((item) => (
              <div key={item.title} className="relative">
                <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{ background: '#000', borderColor: item.color, boxShadow: `0 0 10px ${item.color}` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                </span>
                <h4 className="font-orbitron font-bold text-white text-sm tracking-wide">{item.title}</h4>
                <p className="text-gray-500 mt-2 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;