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

  try {
    const { password } = await req.json();
    const ownerPassword = Deno.env.get('ADMIN_PASSWORD') || '';

    if (!ownerPassword) {
      return json({ error: 'Owner password is not configured on the server.' }, 500);
    }

    if (typeof password !== 'string' || password.trim().length === 0) {
      return json({ error: 'Password is required.' }, 400);
    }

    if (password !== ownerPassword) {
      return json({ error: 'Incorrect password.' }, 401);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('verify-owner-password failed:', error);
    return json({ error: 'Failed to verify password.' }, 500);
  }
});
