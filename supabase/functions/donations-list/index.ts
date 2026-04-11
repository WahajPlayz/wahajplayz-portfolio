import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verify token
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized.' }, 401);
  const token = authHeader.slice(7).trim();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized.' }, 401);

  try {
    const { data, error } = await admin
      .from('donations')
      .select('id, donor_name, donor_email, amount_gbp, amount_original, currency_original, message, created_at, replied, last_reply_at, owner_reply')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const conversations = (data || []).map((d) => ({
      id: d.id,
      donorName: d.donor_name,
      donorEmail: d.donor_email,
      amountGBP: d.amount_gbp,
      amountOriginal: d.amount_original,
      currencyOriginal: d.currency_original,
      message: d.message,
      createdAt: d.created_at,
      replied: d.replied,
      lastReplyAt: d.last_reply_at,
      ownerReply: d.owner_reply,
    }));

    return json({ conversations });
  } catch (err) {
    console.error('donations-list failed:', err);
    return json({ error: 'Failed to fetch donation conversations.' }, 500);
  }
});
