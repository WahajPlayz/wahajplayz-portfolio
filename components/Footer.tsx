import React from 'react';
import { Youtube, ExternalLink, Heart, Coffee } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-950 pt-20 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center text-center">
          
          <div className="mb-8">
             <h2 className="text-3xl font-bold tracking-tighter text-white">
              Wahaj<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Playz</span>
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <a href="https://www.youtube.com/@WahajPlayz20" target="_blank" rel="noopener noreferrer" className="p-4 rounded-full bg-neutral-900 text-white hover:bg-red-600 hover:text-white transition-all transform hover:-translate-y-1">
              <Youtube size={24} />
            </a>
            <a href="https://www.tiktok.com/@wahajplayzgames" target="_blank" rel="noopener noreferrer" className="p-4 rounded-full bg-neutral-900 text-white hover:bg-pink-500 hover:text-white transition-all transform hover:-translate-y-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
            </a>
            <a href="https://discord.com/invite/JMgSaKj6st" target="_blank" rel="noopener noreferrer" className="p-4 rounded-full bg-neutral-900 text-white hover:bg-indigo-500 hover:text-white transition-all transform hover:-translate-y-1">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
            </a>
            <a href="https://ko-fi.com/wahajplayz" target="_blank" rel="noopener noreferrer" className="p-4 rounded-full bg-neutral-900 text-white hover:bg-yellow-500 hover:text-black transition-all transform hover:-translate-y-1">
              <Heart size={24} fill="currentColor" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full mb-12">
            <a 
              href="https://ko-fi.com/wahajplayz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#7E57C2] border border-transparent hover:bg-[#6846a3] transition-colors text-lg font-bold text-white shadow-lg shadow-purple-900/20"
            >
              <div className="bg-white/20 p-1 rounded-full">
                <Coffee size={18} fill="currentColor" />
              </div>
              Support me
            </a>
            <a 
              href="https://discord.com/invite/JMgSaKj6st" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#5865F2] border border-transparent hover:bg-[#4752c4] transition-colors text-lg font-bold text-white shadow-lg shadow-indigo-900/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/></svg>
              Join Discord
            </a>
          </div>

          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} WahajPlayz. All rights reserved. <br/> 
            <span className="opacity-50 text-xs mt-2 block">Designed with React & Tailwind</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;