import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, ensureAuth } from '@/lib/supabase';
import { StoreConfig, storeDefaults } from '../config/storeConfig';

interface StoreContextType {
  config: StoreConfig;
  saveStore: (c: StoreConfig) => Promise<void>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StoreConfig>(storeDefaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase.from('store_config').select('*').eq('id', 1).single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('StoreContext load failed, using defaults:', error);
        } else if (data) {
          setConfig({
            ...storeDefaults,
            ...(data as Record<string, unknown>),
            storePage: (data as Record<string, unknown>).store_page ?? storeDefaults.storePage,
          } as StoreConfig);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('StoreContext load failed, using defaults:', error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveStore = async (c: StoreConfig) => {
    await ensureAuth();
    setConfig(c);
    await supabase.from('store_config').update({
      enabled: c.enabled,
      heading: c.heading,
      subheading: c.subheading,
      store_page: c.storePage,
      categories: c.categories,
      products: c.products,
    }).eq('id', 1);
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
