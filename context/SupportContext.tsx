import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureStorageAuth } from '../lib/firebase';
import { ownerConfig, OwnerConfig, AdminPermissions, defaultAdminPermissions } from '../config/ownerConfig';

interface SupportContextType {
  config: OwnerConfig;
  saveGoal: (goal: OwnerConfig['goal']) => Promise<void>;
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
  goal: data?.goal ?? ownerConfig.goal,
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
    const unsubscribe = onSnapshot(DOC(), (snap) => {
      setConfig(snap.exists() ? mergeConfig(snap.data() as Partial<OwnerConfig>) : ownerConfig);
      setLoading(false);
    }, (error) => {
      console.error('SupportContext load failed, using defaults:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const saveGoal = async (goal: OwnerConfig['goal']) => {
    await ensureStorageAuth();
    setConfig((current) => ({ ...current, goal }));
    await setDoc(DOC(), { goal }, { merge: true });
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
    <SupportContext.Provider value={{ config, saveGoal, saveMembership, saveDonation, savePosts, savePageContent, saveAdminPermissions, loading }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupportData = () => {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupportData must be used within SupportProvider');
  return ctx;
};
