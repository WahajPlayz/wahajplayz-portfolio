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

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL');
  const APP_URL = Deno.env.get('APP_URL') || 'https://wahajplayz.org';
  const FROM = Deno.env.get('RESEND_FROM') || 'WahajPlayz <notifications@wahajplayz.org>';

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
    const { conversationId, text, senderRole } = await req.json();
    if (!conversationId || !text?.trim() || !senderRole) return json({ error: 'Missing fields.' }, 400);

    const { data: conv, error: convError } = await admin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    if (convError || !conv) return json({ error: 'Conversation not found.' }, 404);

    if (senderRole === 'buyer' && conv.buyer_uid !== user.id) return json({ error: 'Forbidden.' }, 403);

    const now = new Date().toISOString();

    await admin.from('conv_messages').insert({
      conversation_id: conversationId,
      sender_role: senderRole,
      text: text.trim(),
      created_at: now,
    });

    await admin.from('conversations').update({
      last_message: text.trim().slice(0, 120),
      last_message_at: now,
      unread_owner: senderRole === 'buyer' ? (conv.unread_owner || 0) + 1 : conv.unread_owner || 0,
      unread_buyer: senderRole === 'owner' ? (conv.unread_buyer || 0) + 1 : conv.unread_buyer || 0,
    }).eq('id', conversationId);

    const productName = (conv.product_names as string[])?.[0] || 'your order';

    if (RESEND_API_KEY) {
      if (senderRole === 'owner' && conv.buyer_email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: conv.buyer_email,
            subject: `New message about your order — ${productName}`,
            html: `
              <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
                <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">You have a new message</h2>
                <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Regarding: <strong style="color:#fff">${productName}</strong></p>
                <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
                  <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
                </div>
                <a href="${APP_URL}/#/messages" style="display:inline-block;background:#00d4ff;color:#000;font-weight:bold;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px">View &amp; Reply</a>
                <p style="color:#4b5563;font-size:11px;margin-top:24px">You can reply on the website at ${APP_URL}/#/messages</p>
              </div>
            `,
          }),
        });
      } else if (senderRole === 'buyer' && OWNER_EMAIL) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: OWNER_EMAIL,
            subject: `New message from buyer — ${productName}`,
            html: `
              <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
                <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">New message from ${conv.buyer_name || conv.buyer_email}</h2>
                <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Order: <strong style="color:#fff">${productName}</strong></p>
                <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
                  <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
                </div>
                <p style="color:#4b5563;font-size:11px;margin-top:24px">Reply from your Admin Panel → Orders &amp; Messages tab.</p>
              </div>
            `,
          }),
        });
      }
    }

    return json({ ok: true });
  } catch (err) {
    console.error('messages-send failed:', err);
    return json({ error: 'Internal server error.' }, 500);
  }
});
