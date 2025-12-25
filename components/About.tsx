import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const About: React.FC = () => {
  const { openAdmin } = useData();
  const [clickCount, setClickCount] = useState(0);

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 20) {
      openAdmin();
      setClickCount(0);
    }
  };

  return (
    <section id="about" className="py-24 bg-black relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-5xl font-bold mb-8">
              Hi! I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Wahaj</span>.
            </h2>
            
            <div className="space-y-6 text-gray-300 text-lg leading-relaxed">
              <p>
                I'm a game developer and a passionate gamer. I originally started my YouTube channel to create gaming content, 
                but everything changed when I came across a devlog for a platformer I really enjoyed.
              </p>
              <p>
                Watching how the game was built from the ground up inspired me to start my own project. 
                That's how <strong className="text-white">Mecha Overdrive</strong> was born—a first-person shooter I'm developing from scratch.
              </p>
              <p>
                I'm excited to share the journey, from concept to launch, right here on my YouTube channel. 
                I also recently started a new project called <strong className="text-white">Monde Miraculous: Kwami Create</strong>. 
                You can see more details in my Discord server.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
               <div className="px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800 text-sm font-mono text-purple-400">
                 #Unity3D
               </div>
               <div 
                 className="px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800 text-sm font-mono text-pink-400 cursor-default select-none active:scale-95 transition-transform"
                 onClick={handleSecretClick}
               >
                 #IndieDev
               </div>
               <div className="px-4 py-2 bg-neutral-900 rounded-lg border border-neutral-800 text-sm font-mono text-blue-400">
                 #ContentCreator
               </div>
            </div>
          </div>

          {/* Image/Avatar */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative group w-full max-w-md aspect-square">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
                <img 
                  src="https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg" 
                  alt="WahajPlayz Setup" 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6">
                    <p className="text-white font-bold text-xl">Headquarters</p>
                    <p className="text-gray-400 text-sm">Where the magic happens</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default About;
