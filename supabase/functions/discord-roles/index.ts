import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return json(401, { error: 'Missing bearer token' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Supabase env missing' });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: { user }, error: userErr } = await admin.auth.getUser(auth.slice('Bearer '.length).trim());
  if (userErr || !user) return json(401, { error: 'Invalid session' });

  const token = Deno.env.get('DISCORD_BOT_TOKEN') || '';
  const guildId = Deno.env.get('DISCORD_GUILD_ID') || '';
  if (!token || !guildId) {
    return json(500, { error: 'Discord bot is not configured (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID missing).' });
  }

  try {
    const dRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!dRes.ok) {
      const detail = await dRes.text().catch(() => '');
      console.error('[discord-roles] discord error', dRes.status, detail);
      return json(502, { error: `Discord API error: ${dRes.status}` });
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
    return json(200, { roles });
  } catch (err) {
    console.error('[discord-roles] failed', err);
    return json(500, { error: err instanceof Error ? err.message : 'Failed to fetch roles' });
  }
});
