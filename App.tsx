import React, { useEffect, useRef } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Creations from './components/Creations';
import Roadmap from './components/Roadmap';
import Experience from './components/Experience';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import MemberPanel from './components/MemberPanel';
import { DataProvider, useData } from './context/DataContext';

// Konami code: ↑↑↓↓←→←→ba — secret owner panel access
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const AppInner: React.FC = () => {
  const { openMemberPanel } = useData();
  const keySequence = useRef<string[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      keySequence.current = [...keySequence.current, e.key].slice(-KONAMI.length);
      if (keySequence.current.join(',') === KONAMI.join(',')) {
        openMemberPanel();
        keySequence.current = [];
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [openMemberPanel]);

  return (
    <div className="bg-black min-h-screen text-white selection:bg-purple-500 selection:text-white relative">
      <Header />
      <main>
        <Hero />
        <About />
        <Creations />
        <Roadmap />
        <Experience />
        <FAQ />
      </main>
      <Footer />
      <AdminPanel />
      <MemberPanel />
    </div>
  );
};

const App: React.FC = () => (
  <DataProvider>
    <AppInner />
  </DataProvider>
);

export default App;
