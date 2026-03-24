import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { redirectToDiscordOAuth } from '@/lib/discord';

const DiscordLink: React.FC = () => {
  const { user } = useAuth();
  const { discordUser } = useData();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('wahaj_skip_discord')) setDismissed(true);
  }, []);

  if (!user || discordUser || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('wahaj_skip_discord', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-24 right-6 z-[9995] max-w-xs p-4 transition-all"
      style={{ background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.4)', clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}>
      <button onClick={handleDismiss} className="absolute top-2 right-2 text-gray-600 hover:text-white"><X size={14} /></button>
      <p className="font-orbitron text-xs text-white mb-1">Link Discord</p>
      <p className="text-gray-400 text-xs mb-3">Connect Discord for team features and community access.</p>
      <button onClick={redirectToDiscordOAuth}
        className="w-full py-2 font-orbitron text-xs tracking-widest uppercase transition-all hover:scale-105"
        style={{ background: 'rgba(88,101,242,0.3)', border: '1px solid rgba(88,101,242,0.7)', color: '#7289da' }}>
        Link Discord
      </button>
    </div>
  );
};

export default DiscordLink;
