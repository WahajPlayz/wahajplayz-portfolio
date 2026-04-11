import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface MembershipRecord {
  tierId: string;
  billing: string;
  status: string;
  subscriptionId?: string;
  customerId?: string;
  sessionId?: string;
  updatedAt?: number;
}

export const useUserMemberships = () => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Record<string, MembershipRecord>>({});
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) { setMemberships({}); setLoading(false); return; }
    const { data } = await supabase
      .from('memberships')
      .select('tier_id, billing, status, subscription_id, customer_id, session_id, updated_at')
      .eq('user_id', user.id);
    const map: Record<string, MembershipRecord> = {};
    for (const row of (data || [])) {
      map[row.tier_id] = {
        tierId: row.tier_id,
        billing: row.billing,
        status: row.status,
        subscriptionId: row.subscription_id,
        customerId: row.customer_id,
        sessionId: row.session_id,
        updatedAt: row.updated_at,
      };
    }
    setMemberships(map);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMemberships();
    if (!user) return;
    const channel = supabase.channel(`memberships-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'memberships', filter: `user_id=eq.${user.id}` },
        () => fetchMemberships())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMemberships]);

  const hasTier = (tierId: string) => memberships[tierId]?.status === 'active';
  const hasAnyTier = (tierIds: string[]) => tierIds.some(hasTier);

  return { memberships, loading, hasTier, hasAnyTier };
};
