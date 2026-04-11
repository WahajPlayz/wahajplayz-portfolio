import { getAuthToken, FUNCTIONS_URL } from '@/lib/supabase';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const uploadToGitHub = async (
  file: File,
  folder: string,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; path: string }> => {
  onProgress?.(10);
  const content = await fileToBase64(file);
  onProgress?.(50);

  const token = (await getAuthToken()) ?? '';

  const res = await fetch(`${FUNCTIONS_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content, filename: file.name, folder }),
  });

  onProgress?.(95);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }

  const data = await res.json() as { url: string; path: string };
  onProgress?.(100);
  return data;
};
