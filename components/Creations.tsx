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
    <section id="creations" className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Explore My <span className="text-purple-500">Creations</span></h2>
          <p className="text-gray-400 max-w-2xl">Games, mods, and tools built with passion and code.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="group relative h-[400px] w-full rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
            >
              {/* Background Image */}
              <img 
                src={project.imageUrl} 
                alt={project.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>

              {/* Content Container */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                
                {/* Top Section */}
                <div>
                   <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/10 uppercase tracking-wider mb-4">
                    {project.tag}
                  </span>
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                    {project.title}
                  </h3>
                </div>

                {/* Bottom Section (Description & Action) */}
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-gray-300 mb-6 line-clamp-2 group-hover:line-clamp-none transition-all">
                    {project.description}
                  </p>
                  
                  <a 
                    href={project.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold hover:bg-purple-500 hover:text-white transition-colors"
                  >
                    {project.title.includes('Mecha') ? <Play size={18} fill="currentColor" /> : <MessageCircle size={18} />}
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