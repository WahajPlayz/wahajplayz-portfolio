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

  const conversationId = new URL(req.url).searchParams.get('conversationId');
  if (!conversationId) return json({ error: 'Missing conversationId.' }, 400);

  try {
    const { data: conv, error: convError } = await admin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    if (convError || !conv) return json({ error: 'Not found.' }, 404);

    const { data: messages, error: msgError } = await admin
      .from('conv_messages')
      .select('id, sender_role, text, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (msgError) throw msgError;

    const conversation = {
      id: conv.id,
      orderId: conv.order_id,
      buyerUid: conv.buyer_uid,
      buyerEmail: conv.buyer_email,
      buyerName: conv.buyer_name,
      productIds: conv.product_ids,
      productNames: conv.product_names,
      createdAt: conv.created_at,
      lastMessageAt: conv.last_message_at,
      lastMessage: conv.last_message,
      unreadOwner: conv.unread_owner,
      unreadBuyer: conv.unread_buyer,
    };

    const mapped = (messages || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      senderRole: m.sender_role,
      text: m.text,
      createdAt: m.created_at,
    }));

    return json({ conversation, messages: mapped });
  } catch (err) {
    console.error('messages-thread failed:', err);
    return json({ error: 'Internal server error.' }, 500);
  }
});
