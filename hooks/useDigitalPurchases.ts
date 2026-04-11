import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface DigitalPurchase {
  productId: string;
  productName: string;
  status: string;
  grantedAt?: number;
  sessionId?: string;
}

export const useDigitalPurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<DigitalPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    if (!user) { setPurchases([]); setLoading(false); return; }
    const { data } = await supabase
      .from('digital_purchases')
      .select('product_id, product_name, status, granted_at, session_id')
      .eq('user_id', user.id);
    setPurchases((data || []).map(row => ({
      productId: row.product_id,
      productName: row.product_name,
      status: row.status,
      grantedAt: row.granted_at,
      sessionId: row.session_id,
    })));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPurchases();
    if (!user) return;
    const channel = supabase.channel(`digital-purchases-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_purchases', filter: `user_id=eq.${user.id}` },
        () => fetchPurchases())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPurchases]);

  return { purchases, loading };
};
