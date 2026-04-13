export const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string;
export const DISCORD_REDIRECT_URI = (import.meta.env.VITE_DISCORD_REDIRECT_URI || window.location.origin) as string;
export const OWNER_DISCORD_ID = import.meta.env.VITE_OWNER_DISCORD_ID as string;

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

export const getDiscordAvatarUrl = (user: DiscordUser): string => {
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id.slice(-1)) % 5}.png`;
};

export const redirectToDiscordOAuth = (): void => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'token',
    scope: 'identify',
  });
  window.location.href = `https://discord.com/api/oauth2/authorize?${params}`;
};

const DISCORD_OAUTH_STORAGE_KEY = 'discord_oauth_hash';

export const parseDiscordTokenFromHash = (): { token: string; expiresAt: number } | null => {
  const rawHash = sessionStorage.getItem(DISCORD_OAUTH_STORAGE_KEY) || window.location.hash;
  if (!rawHash) return null;
  // Discord OAuth responses always include scope=identify; Supabase/Google never do
  if (!rawHash.includes('scope=identify')) return null;
  const params = new URLSearchParams(rawHash.replace(/^#/, ''));
  const token = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '604800');
  if (!token) return null;
  sessionStorage.removeItem(DISCORD_OAUTH_STORAGE_KEY);
  return { token, expiresAt: Date.now() + expiresIn * 1000 };
};

export const stashDiscordOAuthHash = (): void => {
  if (!window.location.hash.includes('access_token=')) return;
  sessionStorage.setItem(DISCORD_OAUTH_STORAGE_KEY, window.location.hash);
};

export const fetchDiscordUser = async (token: string): Promise<DiscordUser> => {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Discord user');
  return res.json();
};
