import React from 'react';
import { ArrowDown, Youtube, Heart, Coffee } from 'lucide-react';

const Hero: React.FC = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        {/* Simple CSS Grid/Noise substitute to avoid external URL blockers */}
        <div className="absolute inset-0 opacity-20" style={{ 
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
          backgroundSize: '40px 40px' 
        }}></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
          <span className="text-xs md:text-sm font-semibold text-purple-300 tracking-wider uppercase">Indie Developer & Content Creator</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-6">
          Building Worlds. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500">
            Coding Dreams.
          </span>
        </h1>

        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <a href="https://www.youtube.com/@WahajPlayz20" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 text-white hover:bg-red-600 hover:text-white transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
            <Youtube size={24} />
          </a>
          <a href="https://www.tiktok.com/@wahajplayzgames" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 text-white hover:bg-pink-500 hover:text-white transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
          </a>
          <a href="https://discord.com/invite/JMgSaKj6st" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 text-white hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
          </a>
          <a href="https://ko-fi.com/wahajplayz" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 text-white hover:bg-yellow-500 hover:text-black transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
            <Heart size={24} fill="currentColor" />
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a 
            href="#creations" 
            className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#creations')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            View Projects
          </a>
          <a 
            href="#about" 
            className="px-8 py-4 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white font-bold text-lg hover:bg-white/10 transition-colors w-full sm:w-auto"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#about')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            My Story
          </a>
        </div>

        {/* Support Me Button */}
        <div className="flex justify-center">
          <a 
            href="https://ko-fi.com/wahajplayz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-3 rounded-full bg-[#7E57C2] text-white font-bold text-lg hover:bg-[#6846a3] transition-all transform hover:scale-105 shadow-lg shadow-purple-500/20"
          >
            <div className="bg-white/20 p-1.5 rounded-full">
               <Coffee size={20} className="text-white" fill="currentColor" />
            </div>
            Support me
          </a>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce text-gray-500">
        <ArrowDown size={24} />
      </div>
    </section>
  );
};

export default Hero;