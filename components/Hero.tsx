import React from 'react';
import "bootstrap-icons/font/bootstrap-icons.css";
import { ArrowDown, Youtube, Heart, Coffee, Laptop } from 'lucide-react';

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
          <a
           href="https://discord.com/invite/JMgSaKj6st"
           target="_blank"
           rel="noopener noreferrer"
           className="p-3 rounded-full bg-white/10 text-white hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10"
          >
           <svg
             xmlns="http://www.w3.org/2000/svg"
             width="24"
             height="24"
             viewBox="0 0 16 16"
            fill="currentColor"
          >
           <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
         </svg>
        </a>
<a
  href="https://www.patreon.com/cw/WahajPlayz"
  target="_blank"
  rel="noopener noreferrer"
  className="p-3 rounded-full bg-white/10 text-white hover:bg-blue-500 hover:text-white transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    role="img"
    aria-hidden="true"
  >
    <path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z" />
  </svg>
</a>
          <a href="https://ko-fi.com/wahajplayz" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 text-white hover:bg-purple-500 hover:text-black transition-all transform hover:-translate-y-1 backdrop-blur-sm border border-white/10">
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

 {/* Patreon */}
<div className="flex justify-center">
  <a 
    href="https://www.patreon.com/c/wahajplayz/membership" 
    target="_blank" 
    rel="noopener noreferrer"
    className="flex items-center gap-3 px-8 py-3 rounded-full bg-[#0059FF] text-white font-bold text-lg hover:bg-[#00E1FF] transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20"
  >
    <div className="bg-white/20 p-1.5 rounded-full">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-white"
        role="img"
        aria-hidden="true"
      >
        <path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z" />
      </svg>
    </div>
    Become a Patreon member
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