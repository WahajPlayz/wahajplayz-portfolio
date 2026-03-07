import React, { useEffect, useState } from 'react';

interface DiscordStats {
  memberCount: number | null;
  onlineCount: number | null;
  iconUrl: string | null;
  serverName: string | null;
}

const Community: React.FC = () => {
  const [stats, setStats] = useState<DiscordStats>({ memberCount: null, onlineCount: null, iconUrl: null, serverName: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://discord.com/api/v9/invites/JMgSaKj6st?with_counts=true')
      .then(r => r.json())
      .then(data => {
        const guild = data.guild;
        let iconUrl: string | null = null;
        if (guild?.icon) {
          // Hashes starting with 'a_' are animated GIFs
          const ext = guild.icon.startsWith('a_') ? 'gif' : 'png';
          iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=128`;
        }
        setStats({
          memberCount: data.approximate_member_count ?? null,
          onlineCount: data.approximate_presence_count ?? null,
          iconUrl,
          serverName: guild?.name ?? null,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (n: number | null) =>
    n === null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <section id="community" className="py-24 relative overflow-hidden" style={{ background: '#0d0e12' }}>
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(88,101,242,0.08) 0%, transparent 70%)' }} />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12" style={{ background: '#7289da' }} />
          <span className="font-orbitron text-xs tracking-widest uppercase" style={{ color: '#7289da' }}>// COMMUNITY</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #7289da, transparent)' }} />
        </div>
        <div className="mb-12">
          <h2 className="font-orbitron font-black text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
            JOIN THE <span style={{ color: '#7289da', textShadow: '0 0 20px rgba(114,137,218,0.6)' }}>COMMUNITY</span>
          </h2>
          <p className="text-gray-500 max-w-xl">Connect with fellow gamers, get early access to updates, and be part of the journey.</p>
        </div>

        <div
          className="relative p-8 md:p-12 transition-all duration-500 group"
          style={{
            background: 'rgba(88,101,242,0.04)',
            border: '1px solid rgba(88,101,242,0.3)',
            clipPath: 'polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 28px 100%, 0 calc(100% - 28px))',
            boxShadow: '0 0 40px rgba(88,101,242,0.08)',
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 60px rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.6)' }} />
          <div className="absolute top-0 right-0 w-14 h-14 border-r-2 border-t-2" style={{ borderColor: 'rgba(88,101,242,0.5)' }} />
          <div className="absolute bottom-0 left-0 w-14 h-14 border-l-2 border-b-2" style={{ borderColor: 'rgba(88,101,242,0.3)' }} />

          <div className="flex flex-col lg:flex-row items-center gap-10 relative z-10">
            <div className="flex flex-col items-center text-center lg:text-left lg:items-start gap-6 flex-shrink-0">
              <div
                className="w-24 h-24 overflow-hidden flex items-center justify-center"
                style={{ border: '2px solid rgba(88,101,242,0.4)', boxShadow: '0 0 30px rgba(88,101,242,0.3)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', background: 'rgba(88,101,242,0.15)' }}
              >
                {stats.iconUrl ? (
                  <img
                    src={stats.iconUrl}
                    alt="Server icon"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#7289da">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                  </svg>
                )}
              </div>

              <div className="flex gap-4">
                <div className="text-center p-3 min-w-[80px]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(88,101,242,0.2)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                  <div className="font-orbitron font-black text-xl" style={{ color: '#7289da' }}>
                    {loading ? <span className="animate-pulse">···</span> : fmt(stats.memberCount)}
                  </div>
                  <div className="text-xs text-gray-500 tracking-wider mt-1">MEMBERS</div>
                </div>
                <div className="text-center p-3 min-w-[80px]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(87,242,135,0.2)', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}>
                  <div className="font-orbitron font-black text-xl flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: '#57f287', boxShadow: '0 0 6px #57f287' }} />
                    <span style={{ color: '#57f287' }}>
                      {loading ? <span className="animate-pulse">···</span> : fmt(stats.onlineCount)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 tracking-wider mt-1">ONLINE</div>
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-orbitron font-black text-white text-xl md:text-2xl mb-4 tracking-wide">{stats.serverName ?? 'WahajPlayz Server'}</h3>
              <ul className="space-y-3 mb-8">
                {[
                  'Get early access to game updates & devlogs',
                  'Direct communication with the developer',
                  'Exclusive sneak peeks and behind-the-scenes',
                  'Community events and giveaways',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7289da', boxShadow: '0 0 6px #7289da' }} />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://discord.com/invite/JMgSaKj6st"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 font-orbitron font-bold text-sm tracking-widest uppercase transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #5865f2, #7289da)',
                  color: '#fff',
                  clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
                  boxShadow: '0 0 30px rgba(88,101,242,0.4)',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z"/>
                </svg>
                JOIN THE SERVER
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Community;
