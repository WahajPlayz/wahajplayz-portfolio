import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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
  const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'noreply@wahajplayz.org';
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL');

  try {
    const { service, description, contact } = await req.json();

    if (!service?.trim() || !description?.trim() || !contact?.trim()) {
      return json({ error: 'Service, description, and contact are required.' }, 400);
    }
    if (!RESEND_API_KEY || !OWNER_EMAIL) {
      return json({ error: 'Commission form not configured on server.' }, 500);
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [OWNER_EMAIL],
        subject: `[Commission Request] ${service.trim()}`,
        html: `
          <div style="font-family:monospace;background:#0d0e12;color:#e5e7eb;padding:24px;border-radius:8px;border:1px solid rgba(0,212,255,0.2)">
            <h2 style="color:#00d4ff;margin:0 0 16px">New Commission Request</h2>
            <p style="margin:0 0 8px"><strong style="color:#ec4899">Service:</strong> ${escHtml(service.trim())}</p>
            <hr style="border-color:rgba(255,255,255,0.1);margin:16px 0"/>
            <p style="margin:0 0 8px"><strong style="color:#a855f7">Request Details:</strong></p>
            <p style="white-space:pre-wrap;line-height:1.6;margin:0 0 16px">${escHtml(description.trim())}</p>
            <hr style="border-color:rgba(255,255,255,0.1);margin:16px 0"/>
            <p style="margin:0"><strong style="color:#a855f7">Contact Info:</strong> ${escHtml(contact.trim())}</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      return json({ error: (err as { message?: string }).message || 'Failed to send request.' }, 500);
    }

    // Save to DB (non-fatal)
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await admin.from('commission_requests').insert({
        service: service.trim(),
        description: description.trim(),
        contact: contact.trim(),
        created_at: new Date().toISOString(),
        read: false,
      });
    } catch { /* non-fatal */ }

    return json({ ok: true });
  } catch (err) {
    console.error('commissions failed:', err);
    return json({ error: 'Failed to send request.' }, 500);
  }
});
