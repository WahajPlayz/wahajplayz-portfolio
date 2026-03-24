import React from 'react';
import GoalBar from '@/components/GoalBar';
import MembershipTiers from '@/components/MembershipTiers';
import DonationPanel from '@/components/DonationPanel';

const SupportDonation: React.FC = () => {
  return (
    <section id="support-donate" className="relative py-24 scanline-overlay overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.35), transparent)', filter: 'blur(100px)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.28), transparent)', filter: 'blur(110px)' }} />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <p className="font-orbitron text-xs tracking-[0.34em] uppercase mb-4" style={{ color: '#ec4899' }}>Support The Build</p>
          <h2 className="font-orbitron font-black text-4xl md:text-6xl mb-6 leading-tight">
            <span className="text-white">KEEP THE</span>{' '}
            <span style={{ background: 'linear-gradient(135deg,#ec4899,#a855f7,#00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PROJECT MOVING</span>
          </h2>
          <p className="text-gray-400 max-w-3xl mx-auto text-base md:text-lg">
            The homepage support block now matches the full donate page: same funding language, same direct support panel, and the same checkout expectations.
          </p>
        </div>

        <div className="max-w-5xl mx-auto mb-14">
          <GoalBar />
        </div>

        <div className="max-w-5xl mx-auto mb-20">
          <DonationPanel />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-orbitron text-xs tracking-[0.28em] uppercase text-cyan-300 mb-3">Membership</p>
            <h3 className="font-orbitron font-black text-3xl md:text-4xl text-white mb-3">Prefer recurring support?</h3>
            <p className="text-gray-500 max-w-2xl mx-auto">Membership stays directly underneath the one-time support card so the whole support area feels unified.</p>
          </div>
          <MembershipTiers />
        </div>
      </div>
    </section>
  );
};

export default SupportDonation;
