import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const noopResult = <T>(data: T | null = null) => Promise.resolve({ data, error: null });

const createNoopQuery = () => {
  const query: any = Promise.resolve({ data: null, error: null });

  const chain = () => query;
  query.select = chain;
  query.eq = chain;
  query.order = chain;
  query.limit = chain;
  query.single = chain;
  query.maybeSingle = chain;
  query.update = () => noopResult();
  query.insert = () => noopResult();
  query.delete = () => noopResult();
  query.upsert = () => noopResult();
  query.then = query.then.bind(query);
  return query;
};

const createNoopChannel = () => {
  const channel: any = {
    on: () => channel,
    subscribe: () => ({ unsubscribe() {} }),
  };
  return channel;
};

const noopSupabase = {
  auth: {
    getSession: () => noopResult({ session: null }),
    refreshSession: () => noopResult({ session: null }),
    signInAnonymously: () => noopResult({ user: null, session: null }),
    signInWithOAuth: () => noopResult({ provider: null, url: null }),
    signInWithPassword: () => noopResult({ user: null, session: null }),
    signUp: () => noopResult({ user: null, session: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } }, error: null }),
  },
  from: () => createNoopQuery(),
  channel: () => createNoopChannel(),
  removeChannel: () => undefined,
} as any;

if (!hasSupabaseConfig) {
  console.warn('Supabase env vars are missing; running in offline fallback mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live data.');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : noopSupabase;

/** Base URL for Supabase Edge Functions, e.g. https://<ref>.supabase.co/functions/v1 */
export const FUNCTIONS_URL = hasSupabaseConfig
  ? supabaseUrl.replace(/\/$/, '') + '/functions/v1'
  : '';

let anonAuthPromise: Promise<void> | null = null;

/** Ensures a Supabase session exists (anonymous if not signed in). Replaces ensureStorageAuth(). */
export const ensureAuth = async (): Promise<void> => {
  if (!hasSupabaseConfig) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return;
  if (!anonAuthPromise) {
    anonAuthPromise = supabase.auth.signInAnonymously()
      .then(() => {})
      .finally(() => { anonAuthPromise = null; });
  }
  return anonAuthPromise;
};

/** Returns the current JWT access token. Replaces firebase.currentUser.getIdToken(). */
export const getAuthToken = async (forceRefresh = false): Promise<string | null> => {
  if (!hasSupabaseConfig) return null;
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};
