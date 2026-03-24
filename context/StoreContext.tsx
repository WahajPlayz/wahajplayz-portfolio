import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureStorageAuth } from '../lib/firebase';
import { StoreConfig, storeDefaults } from '../config/storeConfig';

interface StoreContextType {
  config: StoreConfig;
  saveStore: (c: StoreConfig) => Promise<void>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const DOC = () => doc(db, 'wahaj_data', 'store');

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StoreConfig>(storeDefaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getDoc(DOC()).then((snap) => {
      if (cancelled) return;
      if (snap.exists()) setConfig({ ...storeDefaults, ...snap.data() as StoreConfig });
      setLoading(false);
    }).catch((error) => {
      console.error('StoreContext load failed, using defaults:', error);
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveStore = async (c: StoreConfig) => {
    await ensureStorageAuth();
    setConfig(c);
    await setDoc(DOC(), c);
  };

  return (
    <StoreContext.Provider value={{ config, saveStore, loading }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
