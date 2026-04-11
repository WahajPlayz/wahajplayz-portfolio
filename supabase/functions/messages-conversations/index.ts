import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const rowToConv = (d: Record<string, unknown>) => ({
  id: d.id,
  orderId: d.order_id,
  buyerUid: d.buyer_uid,
  buyerEmail: d.buyer_email,
  buyerName: d.buyer_name,
  productIds: d.product_ids,
  productNames: d.product_names,
  createdAt: d.created_at,
  lastMessageAt: d.last_message_at,
  lastMessage: d.last_message,
  unreadOwner: d.unread_owner,
  unreadBuyer: d.unread_buyer,
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

  const url = new URL(req.url);

  try {
    if (req.method === 'POST') {
      const { orderId, buyerUid, buyerEmail, buyerName, productIds, productNames } = await req.json();
      if (!orderId || !buyerUid) return json({ error: 'Missing orderId or buyerUid.' }, 400);

      const { data: existing } = await admin.from('conversations').select('id').eq('order_id', orderId).single();
      if (existing) return json({ conversationId: (existing as { id: string }).id });

      const now = new Date().toISOString();
      const { data: created, error } = await admin.from('conversations').insert({
        order_id: orderId,
        buyer_uid: buyerUid,
        buyer_email: buyerEmail || '',
        buyer_name: buyerName || buyerEmail || 'Buyer',
        product_ids: productIds || [],
        product_names: productNames || [],
        created_at: now,
        last_message_at: now,
        last_message: '',
        unread_owner: 0,
        unread_buyer: 0,
      }).select('id').single();

      if (error) throw error;
      return json({ conversationId: (created as { id: string }).id });
    }

    if (req.method === 'GET') {
      const all = url.searchParams.get('all') === 'true';
      let query = admin.from('conversations').select('*').order('last_message_at', { ascending: false });
      if (!all) {
        query = query.eq('buyer_uid', user.id);
      } else {
        query = query.limit(50);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ conversations: (data || []).map(rowToConv) });
    }

    if (req.method === 'PATCH') {
      const { conversationId, role } = await req.json();
      if (!conversationId || !role) return json({ error: 'Missing fields.' }, 400);
      await admin.from('conversations').update(
        role === 'owner' ? { unread_owner: 0 } : { unread_buyer: 0 },
      ).eq('id', conversationId);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed.' }, 405);
  } catch (err) {
    console.error('messages-conversations failed:', err);
    return json({ error: 'Internal server error.' }, 500);
  }
});
