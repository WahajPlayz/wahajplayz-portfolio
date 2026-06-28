import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken } from '../_lib/admin.js';
import { sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed.');
  }

  const decoded = await verifyIdToken(req.headers.authorization || '');
  if (!decoded?.uid) {
    return sendError(res, 401, 'You must be signed in.');
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) {
    return sendError(res, 500, 'Discord bot is not configured (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID missing).');
  }

  try {
    const dRes = await fetch('https://discord.com/api/v10/guilds/' + guildId + '/roles', {
      headers: { Authorization: 'Bot ' + token },
    });
    if (!dRes.ok) {
      const detail = await dRes.text().catch(() => '');
      console.error('[guild-roles] discord error', dRes.status, detail);
      return sendError(res, 502, 'Discord API error: ' + dRes.status);
    }
    const raw = await dRes.json();
    const roles = (Array.isArray(raw) ? raw : [])
      .filter((r) => r && r.id && r.id !== guildId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color || 0,
        position: r.position || 0,
        managed: !!r.managed,
      }))
      .sort((a, b) => b.position - a.position);

    return res.status(200).json({ roles });
  } catch (error) {
    console.error('guild-roles failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to fetch guild roles.');
  }
}
