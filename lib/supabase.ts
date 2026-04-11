import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let anonAuthPromise: Promise<void> | null = null;

/** Ensures a Supabase session exists (anonymous if not signed in). Replaces ensureStorageAuth(). */
export const ensureAuth = async (): Promise<void> => {
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
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
};
