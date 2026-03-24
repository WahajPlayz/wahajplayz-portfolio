import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';

type MembershipRecord = {
  tierId: string;
  billing: string;
  status: string;
};

export const useUserMemberships = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Record<string, MembershipRecord>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setMemberships({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = collection(db, 'users', user.uid, 'memberships');
    const unsub = onSnapshot(ref, snap => {
      const next: Record<string, MembershipRecord> = {};
      snap.forEach(doc => { next[doc.id] = doc.data() as MembershipRecord; });
      setMemberships(next);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user]);

  const hasTier = (tierId: string) => memberships[tierId]?.status === 'active';
  const hasAnyTier = (tierIds: string[]) => tierIds.length === 0 || tierIds.some(id => hasTier(id));

  return { memberships, loading, hasTier, hasAnyTier };
};
