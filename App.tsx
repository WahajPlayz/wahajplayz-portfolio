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
import DiscordLink from './components/DiscordLink';
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
import ContactModal from './components/ContactModal';
import PageTransition from './components/PageTransition';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const MemberPanel = lazy(() => import('./components/MemberPanel'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const PostsPage = lazy(() => import('./pages/Posts'));
const StorePage = lazy(() => import('./pages/Store'));
const StoreProductDetailPage = lazy(() => import('./pages/StoreProductDetail'));
const DownloadPage = lazy(() => import('./pages/Download'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const MessagesPage = lazy(() => import('./pages/Messages'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccess'));

// Konami code: ↑↑↓↓←→←→ba — secret owner panel access
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const SECTION_IDS = new Set([
  'home', 'about', 'creations', 'roadmap',
  'experience', 'community', 'faq',
]);
const PENDING_SCROLL_KEY = 'pendingScrollSection';

const LOGO_URL = 'https://image2url.com/images/1764855565391-0a72f241-20cc-4bfc-844f-3769bacb6171.jpg';
const PAGE_NAMES: Record<string, string> = {
  '': 'Website',
  'posts': 'Posts',
  'profile': 'Profile',
  'store': 'Store',
  'store/success': 'Order Confirmed',
  'download': 'Download',
  'messages': 'Messages',
};

const RouteLoader: React.FC = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const name = PAGE_NAMES[hash] !== undefined
    ? PAGE_NAMES[hash]
    : hash.startsWith('store/') ? 'Store' : 'Website';
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#0d0e12',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000,
    }}>
      <img
        src={LOGO_URL}
        alt="WahajPlayz"
        style={{
          width: 96, height: 96, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid rgba(0,212,255,0.5)',
          boxShadow: '0 0 24px rgba(0,212,255,0.6), 0 0 60px rgba(0,212,255,0.25)',
        }}
      />
      <p style={{
        marginTop: 28, fontFamily: 'Orbitron, sans-serif', fontSize: 10,
        fontWeight: 700, letterSpacing: '0.25em', color: 'rgba(0,212,255,0.7)',
        textTransform: 'uppercase',
      }}>Loading up</p>
      <p style={{
        marginTop: 8, fontFamily: 'Orbitron, sans-serif', fontSize: 22,
        fontWeight: 900, color: '#ffffff',
        textShadow: '0 0 12px rgba(0,212,255,0.7), 0 0 30px rgba(0,212,255,0.3)',
        letterSpacing: '0.05em',
      }}>{name}</p>
    </div>
  );
};

const GlobalAuthModal: React.FC = () => {
  const { isAuthModalOpen } = useAuth();
  if (!isAuthModalOpen) return null;
  return (
    <Suspense fallback={null}>
      <AuthModal />
    </Suspense>
  );
};

const AppInner: React.FC = () => {
  const { openMemberPanel, isAdminOpen, isMemberPanelOpen } = useData();
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

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_SCROLL_KEY);
    if (!pending) return;
    sessionStorage.removeItem(PENDING_SCROLL_KEY);
    requestAnimationFrame(() => {
      document.getElementById(pending)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, []);

  return (
    <div className="min-h-screen text-white selection:bg-purple-500 selection:text-white relative" style={{ backgroundColor: '#0d0e12' }}>
      <Header />
      <main>
        <Hero />
        <About />
        <Community />
        <Roadmap />
        <Creations />
        <Experience />
        <FAQ />
        <PostsFeed />
        <StoreFront />
      </main>
      <Footer />
      <Suspense fallback={null}>
        {isAdminOpen && <AdminPanel />}
        {isMemberPanelOpen && <MemberPanel />}
      </Suspense>
      <DiscordLink />
      <ContactModal />
    </div>
  );
};

const App: React.FC = () => (
  (() => {
    // Only strip Discord OAuth hash (has scope= but no provider_token=).
    // Supabase Google OAuth hashes contain provider_token= — leave those alone so
    // the Supabase client can read them.
    if (typeof window !== 'undefined' &&
        window.location.hash.includes('access_token=') &&
        !window.location.hash.includes('provider_token=')) {
      stashDiscordOAuthHash();
      const nextUrl = `${window.location.pathname}${window.location.search}#/`;
      window.history.replaceState(null, '', nextUrl);
    }

    // Rewrite bare section anchors like "#creations" (no leading slash) so
    // HashRouter doesn't try to resolve them as routes. Scroll happens inside AppInner.
    if (typeof window !== 'undefined') {
      const raw = window.location.hash.replace(/^#/, '');
      if (raw && !raw.startsWith('/') && !raw.includes('=') && SECTION_IDS.has(raw)) {
        sessionStorage.setItem(PENDING_SCROLL_KEY, raw);
        const nextUrl = `${window.location.pathname}${window.location.search}#/`;
        window.history.replaceState(null, '', nextUrl);
      }
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
                  <PageTransition>
                    <Routes>
                      <Route path="/" element={<AppInner />} />
                      <Route path="/posts" element={<PostsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/store" element={<StorePage />} />
                      <Route path="/store/:productId" element={<StoreProductDetailPage />} />
                      <Route path="/store/success" element={<OrderSuccessPage />} />
                      <Route path="/download" element={<DownloadPage />} />
                      <Route path="/messages" element={<MessagesPage />} />
                    </Routes>
                    <CartDrawer />
                    <GlobalAuthModal />
                  </PageTransition>
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
