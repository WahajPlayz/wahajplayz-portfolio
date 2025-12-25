import React, { useState, useEffect } from 'react';
import { Menu, X, ExternalLink } from 'lucide-react';

const navLinks = [
  { name: 'Home', href: '#home' },
  { name: 'About', href: '#about' },
  { name: 'Creations', href: '#creations' },
  { name: 'Roadmap', href: '#roadmap' },
  { name: 'Experience', href: '#experience' },
  { name: 'FAQ', href: '#faq' },
];

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    // Check if window exists (SSR safety) though mainly for client-side here
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // Initialize state
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without jumping
        window.history.pushState(null, '', href);
      } else {
        console.warn(`Element with id ${href} not found`);
      }
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/80 backdrop-blur-md border-b border-white/10 py-3' 
          : 'bg-transparent py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a 
          href="#home" 
          onClick={(e) => handleNavClick(e, '#home')}
          className="block hover:opacity-80 transition-opacity"
        >
          <img 
            src="https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg" 
            alt="WahajPlayz" 
            className="h-12 w-auto object-contain rounded-full"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-8" aria-label="Main Navigation">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group py-2"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block">
          <a 
            href="https://discord.gg/KF9cMSZ2hW" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all transform hover:scale-105 flex items-center gap-2"
          >
            Join Discord Server <ExternalLink size={14} />
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col space-y-4 shadow-2xl">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href}
              className="text-lg font-medium text-gray-200 hover:text-purple-400 py-2 border-b border-white/5"
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.name}
            </a>
          ))}
          <a 
            href="https://discord.gg/KF9cMSZ2hW"
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block text-center w-full px-5 py-3 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold mt-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            Join Discord server
          </a>
        </div>
      )}
    </header>
  );
};

export default Header;