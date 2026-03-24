import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Creations from './components/Creations';
import Roadmap from './components/Roadmap';
import Experience from './components/Experience';
import FAQ from './components/FAQ';
import Community from './components/Community';
import Footer from './components/Footer';
import StickyMembershipBar from './components/StickyMembershipBar';
import DiscordLink from './components/DiscordLink';
import SupportDonation from './sections/SupportDonation';
import PostsFeed from './sections/PostsFeed';
import StoreFront from './sections/StoreFront';
import { DataProvider, useData } from './context/DataContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SupportProvider } from './context/SupportContext';
import { StoreProvider } from './context/StoreContext';
import { CartProvider } from './context/CartContext';
import { stashDiscordOAuthHash } from './lib/discord';
import CartDrawer from './components/CartDrawer';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const MemberPanel = lazy(() => import('./components/MemberPanel'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const PostsPage = lazy(() => import('./pages/Posts'));
const StorePage = lazy(() => import('./pages/Store'));
const StoreProductDetailPage = lazy(() => import('./pages/StoreProductDetail'));
const DownloadPage = lazy(() => import('./pages/Download'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MembershipPage = lazy(() => import('./pages/Membership'));
const DonatePage = lazy(() => import('./pages/Donate'));

// Konami code: ↑↑↓↓←→←→ba — secret owner panel access
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const RouteLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center text-gray-500 font-mono text-sm" style={{ backgroundColor: '#0d0e12' }}>
    Loading...
  </div>
);

const AppInner: React.FC = () => {
  const { openMemberPanel, isAdminOpen, isMemberPanelOpen } = useData();
  const { isAuthModalOpen } = useAuth();
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
    <div className="min-h-screen text-white selection:bg-purple-500 selection:text-white relative" style={{ backgroundColor: '#0d0e12' }}>
      <StickyMembershipBar />
      <Header />
      <main>
        <Hero />
        <About />
        <Community />
        <Roadmap />
        <Creations />
        <Experience />
        <FAQ />
        <SupportDonation />
        <PostsFeed />
        <StoreFront />
      </main>
      <Footer />
      <Suspense fallback={null}>
        {isAdminOpen && <AdminPanel />}
        {isMemberPanelOpen && <MemberPanel />}
        {isAuthModalOpen && <AuthModal />}
      </Suspense>
      <DiscordLink />
    </div>
  );
};

const App: React.FC = () => (
  (() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
      stashDiscordOAuthHash();
      const nextUrl = `${window.location.pathname}${window.location.search}#/`;
      window.history.replaceState(null, '', nextUrl);
    }

    return (
  <HashRouter>
    <DataProvider>
      <CurrencyProvider>
        <AuthProvider>
          <SupportProvider>
            <StoreProvider>
              <CartProvider>
                <Suspense fallback={<RouteLoader />}>
                  <Routes>
                    <Route path="/" element={<AppInner />} />
                    <Route path="/posts" element={<PostsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/membership" element={<MembershipPage />} />
                    <Route path="/donate" element={<DonatePage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/store/:productId" element={<StoreProductDetailPage />} />
                    <Route path="/download" element={<DownloadPage />} />
                  </Routes>
                  <CartDrawer />
                </Suspense>
              </CartProvider>
            </StoreProvider>
          </SupportProvider>
        </AuthProvider>
      </CurrencyProvider>
    </DataProvider>
  </HashRouter>
    );
  })()
);

export default App;
