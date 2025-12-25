import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Creations from './components/Creations';
import Roadmap from './components/Roadmap';
import Experience from './components/Experience';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import { DataProvider } from './context/DataContext';

const App: React.FC = () => {
  return (
    <DataProvider>
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
      </div>
    </DataProvider>
  );
};

export default App;
