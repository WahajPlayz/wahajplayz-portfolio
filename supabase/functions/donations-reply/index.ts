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
    const { conversationId, text } = await req.json();
    if (!conversationId || !text?.trim()) return json({ error: 'Missing conversationId or text.' }, 400);

    const { data: conv, error: fetchError } = await admin
      .from('donations')
      .select('donor_name, donor_email, amount_gbp, message')
      .eq('id', conversationId)
      .single();
    if (fetchError || !conv) return json({ error: 'Conversation not found.' }, 404);

    const now = new Date().toISOString();

    await admin.from('donations').update({
      replied: true,
      last_reply_at: now,
      owner_reply: text.trim(),
    }).eq('id', conversationId);

    if (conv.donor_email && RESEND_API_KEY) {
      const donorName = conv.donor_name || 'Supporter';
      const amountFormatted = conv.amount_gbp != null ? `£${Number(conv.amount_gbp).toFixed(2)}` : 'your donation';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: conv.donor_email,
          subject: `Re: Your donation to WahajPlayz`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#0d0e12;color:#e5e7eb;padding:32px;border-radius:12px">
              <h2 style="color:#00d4ff;font-size:18px;margin-bottom:8px">A message from WahajPlayz</h2>
              <p style="color:#9ca3af;font-size:13px;margin-bottom:20px">Thank you for your support of ${amountFormatted}, ${donorName}!</p>
              ${conv.message ? `<div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px 16px;margin-bottom:20px;color:#9ca3af;font-size:13px;font-style:italic">"${conv.message}"</div>` : ''}
              <div style="background:#1a1b21;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:24px">
                <p style="margin:0 0 6px 0;font-size:11px;font-weight:600;color:#00d4ff;text-transform:uppercase;letter-spacing:0.05em">Reply from WahajPlayz</p>
                <p style="margin:0;font-size:14px;line-height:1.6">${text.trim()}</p>
              </div>
              <p style="color:#4b5563;font-size:11px;margin-top:24px">This is a reply to your donation at <a href="${APP_URL}" style="color:#00d4ff">${APP_URL}</a></p>
            </div>
          `,
        }),
      });
    }

    return json({ ok: true });
  } catch (err) {
    console.error('donations-reply failed:', err);
    return json({ error: 'Failed to send reply.' }, 500);
  }
});
