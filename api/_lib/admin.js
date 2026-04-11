import { createClient } from '@supabase/supabase-js';

const getAdminClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
};

/** Returns a Supabase admin client for database queries. Replaces getDb() / firebase-admin. */
export const getDb = () => getAdminClient();

/** Returns a Supabase storage instance for digital downloads. Replaces getBucket(). */
export const getStorageClient = () => getAdminClient().storage;

/**
 * Verifies a Supabase JWT from an Authorization header.
 * Returns { uid, email } on success, or null on failure.
 * Replaces firebase-admin verifyIdToken().
 */
export const verifyIdToken = async (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data: { user }, error } = await getAdminClient().auth.getUser(token);
  if (error || !user) return null;
  return { uid: user.id, email: user.email ?? null };
};
