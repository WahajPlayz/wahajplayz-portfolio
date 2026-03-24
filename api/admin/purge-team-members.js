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

    const db = getDb();
    const deletedDiscordUsers = [];
    const discordUsersSnap = await db.collection('discord_users').get();
    for (const docSnap of discordUsersSnap.docs) {
      const data = docSnap.data();
      if (docSnap.id === ownerDiscordId || data?.role === 'owner') continue;
      await docSnap.ref.delete();
      deletedDiscordUsers.push(docSnap.id);
    }

    const deletedRequests = [];
    const requestsSnap = await db.collection('requests').get();
    for (const docSnap of requestsSnap.docs) {
      await docSnap.ref.delete();
      deletedRequests.push(docSnap.id);
    }

    return res.status(200).json({
      removedUsers: deletedDiscordUsers.length,
      removedRequests: deletedRequests.length,
    });
  } catch (error) {
    console.error('purge-team-members failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to purge team members.');
  }
}
