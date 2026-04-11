import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, ensureAuth } from '../lib/supabase';
import { ownerConfig, OwnerConfig, GoalItem, AdminPermissions, defaultAdminPermissions } from '../config/ownerConfig';

interface SupportContextType {
  config: OwnerConfig;
  saveGoals: (goals: GoalItem[]) => Promise<void>;
  saveMembership: (m: OwnerConfig['membership']) => Promise<void>;
  saveDonation: (d: OwnerConfig['donation']) => Promise<void>;
  savePosts: (posts: OwnerConfig['posts']) => Promise<void>;
  savePageContent: (field: 'membershipPage' | 'donatePage', data: { headline: string; subheading: string }) => Promise<void>;
  saveAdminPermissions: (perms: AdminPermissions) => Promise<void>;
  loading: boolean;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

// rowToConfig maps snake_case DB row → OwnerConfig camelCase, merging defaults
const rowToConfig = (row: Record<string, unknown> | null): OwnerConfig => {
  if (!row) return ownerConfig;
  return {
    goals: (() => {
      if (Array.isArray(row.goals) && (row.goals as unknown[]).length > 0) return row.goals as GoalItem[];
      const legacy = (row as Record<string, unknown>).goal;
      if (legacy) return [{ id: 'goal-default', title: (legacy as Record<string, unknown>).type === 'monthly' ? 'Monthly Goal' : 'Goal', ...(legacy as object) }] as GoalItem[];
      return ownerConfig.goals;
    })(),
    membership: Object.assign({}, ownerConfig.membership, (row.membership as object) ?? {}),
    donation: Object.assign({}, ownerConfig.donation, (row.donation as object) ?? {}),
    posts: (row.posts as OwnerConfig['posts']) ?? ownerConfig.posts,
    membershipPage: Object.assign({}, ownerConfig.membershipPage, (row.membership_page as object) ?? {}),
    donatePage: Object.assign({}, ownerConfig.donatePage, (row.donate_page as object) ?? {}),
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

  const saveGoals = async (goals: GoalItem[]) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, goals }));
    await supabase.from('support_config').update({ goals }).eq('id', 1);
  };

  const saveMembership = async (membership: OwnerConfig['membership']) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, membership }));
    await supabase.from('support_config').update({ membership }).eq('id', 1);
  };

  const saveDonation = async (donation: OwnerConfig['donation']) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, donation }));
    await supabase.from('support_config').update({ donation }).eq('id', 1);
  };

  const savePosts = async (posts: OwnerConfig['posts']) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, posts }));
    await supabase.from('support_config').update({ posts }).eq('id', 1);
  };

  const savePageContent = async (field: 'membershipPage' | 'donatePage', data: { headline: string; subheading: string }) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, [field]: data }));
    const col = field === 'membershipPage' ? 'membership_page' : 'donate_page';
    await supabase.from('support_config').update({ [col]: data }).eq('id', 1);
  };

  const saveAdminPermissions = async (adminPermissions: AdminPermissions) => {
    await ensureAuth();
    setConfig((c) => ({ ...c, adminPermissions }));
    await supabase.from('support_config').update({ admin_permissions: adminPermissions }).eq('id', 1);
  };

  return (
    <SupportContext.Provider value={{ config, saveGoals, saveMembership, saveDonation, savePosts, savePageContent, saveAdminPermissions, loading }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupportData = () => {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupportData must be used within SupportProvider');
  return ctx;
};
