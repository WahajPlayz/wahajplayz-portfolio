import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, ensureAuth } from '../lib/supabase';
import { ownerConfig, OwnerConfig, AdminPermissions, defaultAdminPermissions } from '../config/ownerConfig';

interface SupportContextType {
  config: OwnerConfig;
  savePosts: (posts: OwnerConfig['posts']) => Promise<void>;
  saveAdminPermissions: (perms: AdminPermissions) => Promise<void>;
  loading: boolean;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

const rowToConfig = (row: Record<string, unknown> | null): OwnerConfig => {
  if (!row) return ownerConfig;
  return {
    posts: (row.posts as OwnerConfig['posts']) ?? ownerConfig.posts,
    adminPermissions: (row.admin_permissions as AdminPermissions) ?? defaultAdminPermissions,
  };
};

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<OwnerConfig>(ownerConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('support_config').select('*').eq('id', 1).single()
      .then(({ data, error }) => {
        if (error) console.error('SupportContext load failed, using defaults:', error);
        setConfig(rowToConfig(data as Record<string, unknown> | null));
        setLoading(false);
      });

    const channel = supabase.channel('support-config')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_config', filter: 'id=eq.1' },
        (payload) => setConfig(rowToConfig(payload.new as Record<string, unknown>)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const savePosts = async (posts: OwnerConfig['posts']) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, posts }));
    await supabase.from('support_config').update({ posts }).eq('id', 1);
  };

  const saveAdminPermissions = async (adminPermissions: AdminPermissions) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, adminPermissions }));
    await supabase.from('support_config').update({ admin_permissions: adminPermissions }).eq('id', 1);
  };

  return (
    <SupportContext.Provider value={{ config, savePosts, saveAdminPermissions, loading }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupportData = () => {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupportData must be used within SupportProvider');
  return ctx;
};
