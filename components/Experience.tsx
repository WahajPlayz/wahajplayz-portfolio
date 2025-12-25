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
    <section id="experience" className="py-24 bg-neutral-950 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience & <span className="text-blue-500">Skills</span></h2>
          <p className="text-gray-400">The tools and technologies I use to bring ideas to life.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {skills.map((skill, index) => (
            <div 
              key={index}
              className="p-8 rounded-2xl bg-black border border-white/10 hover:border-blue-500/30 hover:bg-neutral-900 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                {skill.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{skill.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{skill.desc}</p>
            </div>
          ))}
        </div>
        
        {/* Timeline Snippet */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Current Focus</h3>
          <div className="relative pl-8 border-l-2 border-purple-500/30 space-y-12">
            <div className="relative">
              <span className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-purple-500 border-4 border-black"></span>
              <h4 className="text-xl font-bold text-white">Developing Mecha Overdrive</h4>
              <p className="text-gray-400 mt-2">Active development of core mechanics, enemy AI, and level design. Weekly updates on YouTube.</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[41px] top-1 h-5 w-5 rounded-full bg-pink-500 border-4 border-black"></span>
              <h4 className="text-xl font-bold text-white">Monde Miraculous Expansion</h4>
              <p className="text-gray-400 mt-2">Integrating Create Mod features and community suggestions.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;