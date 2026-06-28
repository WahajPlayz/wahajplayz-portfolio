const DISCORD_API = 'https://discord.com/api/v10';

const env = () => ({
  token: process.env.DISCORD_BOT_TOKEN || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
});

const headers = (token) => ({
  Authorization: 'Bot ' + token,
  'Content-Type': 'application/json',
});

const callRole = async (method, discordUserId, roleId) => {
  const { token, guildId } = env();
  if (!token || !guildId) {
    console.warn('[discord-bot] DISCORD_BOT_TOKEN or DISCORD_GUILD_ID missing — skipping role op.');
    return { ok: false, skipped: true };
  }
  if (!discordUserId || !roleId) return { ok: false, skipped: true };

  const url = DISCORD_API + '/guilds/' + guildId + '/members/' + discordUserId + '/roles/' + roleId;

  let attempt = 0;
  while (attempt < 2) {
    attempt += 1;
    const res = await fetch(url, { method, headers: headers(token) });
    if (res.status === 204) return { ok: true };
    if (res.status === 404) {
      console.warn('[discord-bot]', method, 'role', roleId, '→ 404 (user not in guild or role missing)');
      return { ok: false, notFound: true };
    }
    if (res.status === 429) {
      let retryMs = 1000;
      try {
        const body = await res.json();
        if (body && typeof body.retry_after === 'number') retryMs = Math.ceil(body.retry_after * 1000);
      } catch {}
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, retryMs + 50));
        continue;
      }
    }
    const text = await res.text().catch(() => '');
    console.error('[discord-bot]', method, url, 'failed', res.status, text);
    return { ok: false, status: res.status };
  }
  return { ok: false };
};

export const assignGuildRole = (discordUserId, roleId) => callRole('PUT', discordUserId, roleId);
export const removeGuildRole = (discordUserId, roleId) => callRole('DELETE', discordUserId, roleId);

const fanOut = async (method, discordUserId, roleIds) => {
  const list = Array.isArray(roleIds) ? roleIds.filter((id) => typeof id === 'string' && id.trim()) : [];
  if (!discordUserId || list.length === 0) return { attempted: 0, succeeded: 0 };
  const results = await Promise.allSettled(list.map((id) => callRole(method, discordUserId, id.trim())));
  const succeeded = results.filter((r) => r.status === 'fulfilled' && r.value && r.value.ok).length;
  return { attempted: list.length, succeeded };
};

export const assignRoles = (discordUserId, roleIds) => fanOut('PUT', discordUserId, roleIds);
export const removeRoles = (discordUserId, roleIds) => fanOut('DELETE', discordUserId, roleIds);
