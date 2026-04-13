import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const AppWithLoader: React.FC = () => {
  useEffect(() => {
    const overlay = document.getElementById('loading-screen');
    if (!overlay) return;
    const MIN_MS = 600;
    const elapsed = Date.now() - ((window as any).__loadStart || Date.now());
    const delay = Math.max(0, MIN_MS - elapsed);
    const t = setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 500);
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppWithLoader />
  </React.StrictMode>
);