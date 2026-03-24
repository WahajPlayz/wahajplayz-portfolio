import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';

type DigitalPurchase = {
  productId: string;
  status: 'pending' | 'paid';
  grantedAt?: number;
};

export const useDigitalPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Record<string, DigitalPurchase>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setPurchases({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, 'users', user.uid, 'digitalPurchases');
    const unsub = onSnapshot(ref, snap => {
      const next: Record<string, DigitalPurchase> = {};
      snap.forEach(doc => {
        const data = doc.data() as DigitalPurchase;
        next[doc.id] = data;
      });
      setPurchases(next);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user]);

  return { purchases, loading };
};
