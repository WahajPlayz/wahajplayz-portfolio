import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureStorageAuth } from '../lib/firebase';
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
const DOC = () => doc(db, 'wahaj_data', 'support');
const mergeConfig = (data?: Partial<OwnerConfig>): OwnerConfig => ({
  goals: (() => {
    if (data?.goals?.length) return data.goals;
    // Migrate legacy single goal
    const legacy = (data as any)?.goal;
    if (legacy) return [{ id: 'goal-default', title: legacy.type === 'monthly' ? 'Monthly Goal' : 'Goal', ...legacy }];
    return ownerConfig.goals;
  })(),
  membership: data?.membership ?? ownerConfig.membership,
  donation: data?.donation ?? ownerConfig.donation,
  posts: data?.posts ?? ownerConfig.posts,
  membershipPage: data?.membershipPage ?? ownerConfig.membershipPage,
  donatePage: data?.donatePage ?? ownerConfig.donatePage,
  adminPermissions: data?.adminPermissions ?? defaultAdminPermissions,
});

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<OwnerConfig>(ownerConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(DOC(), { includeMetadataChanges: true }, (snap) => {
      setConfig(snap.exists() ? mergeConfig(snap.data() as Partial<OwnerConfig>) : ownerConfig);
      // Only mark loading done once we have server-confirmed data (not stale cache)
      if (!snap.metadata.fromCache) setLoading(false);
    }, (error) => {
      console.error('SupportContext load failed, using defaults:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const saveGoals = async (goals: GoalItem[]) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, goals }));
    await setDoc(DOC(), { goals }, { merge: true });
  };

  const saveMembership = async (membership: OwnerConfig['membership']) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, membership }));
    await setDoc(DOC(), { membership }, { merge: true });
  };

  const saveDonation = async (donation: OwnerConfig['donation']) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, donation }));
    await setDoc(DOC(), { donation }, { merge: true });
  };

  const savePosts = async (posts: OwnerConfig['posts']) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, posts }));
    await setDoc(DOC(), { posts }, { merge: true });
  };

  const savePageContent = async (field: 'membershipPage' | 'donatePage', data: { headline: string; subheading: string }) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, [field]: data }));
    return setDoc(DOC(), { [field]: data }, { merge: true });
  };

  const saveAdminPermissions = async (adminPermissions: AdminPermissions) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, adminPermissions }));
    await setDoc(DOC(), { adminPermissions }, { merge: true });
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
