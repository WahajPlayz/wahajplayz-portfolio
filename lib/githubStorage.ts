import { ensureAuth, supabase } from '@/lib/supabase';

export const uploadToGitHub = async (
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; path: string }> => {
  onProgress?.(10);

  await ensureAuth();

  const slug = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${folder}/${Date.now()}_${slug}`;

  onProgress?.(40);

  const { data, error } = await supabase.storage
    .from('assets')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message || 'Upload failed');

  onProgress?.(90);

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(data.path);

  onProgress?.(100);
  return { url: publicUrl, path: data.path };
};
