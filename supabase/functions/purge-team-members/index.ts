import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const ownerDiscordId = Deno.env.get('OWNER_DISCORD_ID') || '';
  const ownerPassword = Deno.env.get('ADMIN_PASSWORD') || '';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { adminPassword, discordToken } = await req.json();

    const ownerVerifiedByPassword = !!ownerPassword && adminPassword === ownerPassword;

    let ownerVerifiedByDiscord = false;
    if (discordToken && ownerDiscordId) {
      const discordRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${discordToken}` },
      });
      if (discordRes.ok) {
        const discordUser = await discordRes.json();
        ownerVerifiedByDiscord = discordUser?.id === ownerDiscordId || discordUser?.username === ownerDiscordId;
      }
    }

    if (!ownerVerifiedByPassword && !ownerVerifiedByDiscord) {
      return json({ error: 'Only the owner can purge team members.' }, 403);
    }

    const { data: toDelete, error: fetchError } = await admin
      .from('discord_users')
      .select('discord_id')
      .neq('discord_id', ownerDiscordId)
      .neq('role', 'owner');

    if (fetchError) throw fetchError;

    let deletedCount = 0;
    for (const row of (toDelete || [])) {
      await admin.from('discord_users').delete().eq('discord_id', (row as { discord_id: string }).discord_id);
      deletedCount++;
    }

    return json({ removedUsers: deletedCount, removedRequests: 0 });
  } catch (err) {
    console.error('purge-team-members failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to purge team members.' }, 500);
  }
});
