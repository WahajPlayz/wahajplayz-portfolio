import { applyCors, handleOptions } from '../_lib/cors.js';
import { getDb } from '../_lib/admin.js';
import { readJson, sendError } from '../_lib/http.js';

const ownerDiscordId = process.env.VITE_OWNER_DISCORD_ID || '';
const ownerPassword = process.env.VITE_ADMIN_PASSWORD || '';

const verifyDiscordOwner = async (token) => {
  if (!token || !ownerDiscordId) return false;
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user?.id === ownerDiscordId || user?.username === ownerDiscordId;
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const body = await readJson(req);
    const adminPassword = String(body.adminPassword || '');
    const discordToken = String(body.discordToken || '');

    const ownerVerifiedByPassword = !!ownerPassword && adminPassword === ownerPassword;
    const ownerVerifiedByDiscord = await verifyDiscordOwner(discordToken);

    if (!ownerVerifiedByPassword && !ownerVerifiedByDiscord) {
      return sendError(res, 403, 'Only the owner can purge team members.');
    }

    const { data: toDelete, error: fetchError } = await getDb()
      .from('discord_users')
      .select('discord_id')
      .neq('discord_id', ownerDiscordId)
      .neq('role', 'owner');

    if (fetchError) throw fetchError;

    let deletedCount = 0;
    for (const row of (toDelete || [])) {
      await getDb().from('discord_users').delete().eq('discord_id', row.discord_id);
      deletedCount++;
    }

    return res.status(200).json({
      removedUsers: deletedCount,
      removedRequests: 0,
    });
  } catch (error) {
    console.error('purge-team-members failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to purge team members.');
  }
}
