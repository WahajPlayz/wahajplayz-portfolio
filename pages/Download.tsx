import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Download, ExternalLink } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { fetchDigitalDownloadUrl, verifyDigitalCheckout } from '@/lib/stripeCheckout';

const TEST_PRODUCT = {
  id: 'test-dummy',
  name: 'Test Dummy Download',
  digitalFileUrl: '/test-download.txt',
  digitalFileName: 'test-download.txt',
};

const DownloadPage: React.FC = () => {
  const { config } = useStore();
  const { user, authLoading, openAuthModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'success' | 'downloading' | 'closing'>('success');
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'verifying' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const productId = params.get('product');
  const sessionId = params.get('session_id');

  const product = useMemo(() => {
    if (!productId) return null;
    if (productId === TEST_PRODUCT.id) return TEST_PRODUCT;
    return config.products.find(item => item.id === productId && item.type === 'digital' && item.enabled) ?? null;
  }, [config.products, productId]);

  useEffect(() => {
    if (!product) return;
    if (product.id === TEST_PRODUCT.id) {
      setResolvedUrl(TEST_PRODUCT.digitalFileUrl);
      setLoadingState('ready');
      return;
    }

    if (!sessionId) {
      if (product.digitalFileUrl) {
        setResolvedUrl(product.digitalFileUrl);
        setLoadingState('ready');
      } else {
        setLoadingState('error');
        setErrorMessage('This product is missing a download file.');
      }
      return;
    }

    if (authLoading) return;
    if (!user) {
      setLoadingState('error');
      setErrorMessage('Sign in with the same account you used for checkout to unlock the download.');
      return;
    }

    let cancelled = false;
    const verifyAndLoad = async () => {
      setLoadingState('verifying');
      setErrorMessage('');
      try {
        const result = await verifyDigitalCheckout(sessionId);
        if (result.status !== 'paid') {
          throw new Error('Payment verification is still pending.');
        }
        const data = await fetchDigitalDownloadUrl(product.id);
        if (!cancelled) {
          setResolvedUrl(data.url);
          setLoadingState('ready');
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingState('error');
          setErrorMessage(error instanceof Error ? error.message : 'Failed to verify the purchase.');
        }
      }
    };

    void verifyAndLoad();
    return () => {
      cancelled = true;
    };
  }, [authLoading, product, sessionId, user]);

  useEffect(() => {
    if (!resolvedUrl || loadingState !== 'ready') return;
    const timers: number[] = [];

    timers.push(window.setTimeout(() => {
      setPhase('downloading');
      const anchor = document.createElement('a');
      anchor.href = resolvedUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = product?.digitalFileName || '';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }, 1800));

    timers.push(window.setTimeout(() => {
      setPhase('closing');
      window.close();
    }, 3200));

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [loadingState, product?.digitalFileName, resolvedUrl]);

  const renderBody = () => {
    if (!product) {
      return (
        <>
          <p className="font-orbitron text-sm tracking-widest uppercase mb-3" style={{ color: '#a855f7' }}>Download</p>
          <h1 className="font-orbitron font-black text-3xl mb-3">Product Not Found</h1>
          <p className="text-gray-400 text-sm">This download link is missing a valid product.</p>
        </>
      );
    }

    if (loadingState === 'verifying' || (authLoading && sessionId)) {
      return (
        <>
          <p className="font-orbitron text-sm tracking-widest uppercase mb-3" style={{ color: '#a855f7' }}>Verifying Purchase</p>
          <h1 className="font-orbitron font-black text-3xl mb-3">Checking Your Payment</h1>
          <p className="text-gray-400 text-sm mb-6">Verifying the Stripe session and preparing your download.</p>
          <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
        </>
      );
    }

    if (loadingState === 'error') {
      return (
        <>
          <p className="font-orbitron text-sm tracking-widest uppercase mb-3" style={{ color: '#a855f7' }}>Download Locked</p>
          <h1 className="font-orbitron font-black text-3xl mb-3">Access Required</h1>
          <p className="text-gray-400 text-sm mb-6">{errorMessage}</p>
          {sessionId && !user && (
            <button
              onClick={() => openAuthModal()}
              className="inline-flex items-center gap-2 px-5 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
              style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.45)', color: '#d8b4fe', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
            >
              Sign In To Unlock
            </button>
          )}
        </>
      );
    }

    return (
      <>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/10" />
            <Check size={30} className="relative text-emerald-400" />
          </div>
          <div>
            <p className="font-orbitron text-sm tracking-widest uppercase mb-2" style={{ color: '#a855f7' }}>Payment Complete</p>
            <h1 className="font-orbitron font-black text-3xl">Thank You</h1>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {phase === 'success' && `Thanks for your purchase. Your download for ${product.name} will start in a moment.`}
          {phase === 'downloading' && 'Your file is being opened now. If the browser allows it, this page will close automatically next.'}
          {phase === 'closing' && 'You can close this tab if it stays open.'}
        </p>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 mb-6">
          <p className="text-sm text-white mb-1">{product.digitalFileName || 'Digital file'}</p>
          <p className="text-xs text-gray-500">
            {phase === 'success' && 'Preparing your file...'}
            {phase === 'downloading' && 'Download started. If nothing appears, use the manual download button below.'}
            {phase === 'closing' && 'Finalizing this page.'}
          </p>
        </div>
        <a
          href={resolvedUrl || '#'}
          download={product.digitalFileName || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.45)', color: '#d8b4fe', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          <Download size={14} /> Download Now <ExternalLink size={12} />
        </a>
      </>
    );
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-6" style={{ backgroundColor: '#0d0e12' }}>
      <div className="w-full max-w-xl rounded-2xl border p-8" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(168,85,247,0.2)' }}>
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs mb-8"
        >
          <ArrowLeft size={14} /> Back to Store
        </button>
        {renderBody()}
      </div>
    </div>
  );
};

export default DownloadPage;
