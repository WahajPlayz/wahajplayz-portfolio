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
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return json({ error: 'Name, email, and message are required.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address.' }, 400);
    }
    if (!RESEND_API_KEY || !OWNER_EMAIL) {
      return json({ error: 'Contact form not configured on server.' }, 500);
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [OWNER_EMAIL],
        reply_to: email,
        subject: `[Contact] ${subject?.trim() || 'New message from ' + name.trim()}`,
        html: `
          <div style="font-family:monospace;background:#0d0e12;color:#e5e7eb;padding:24px;border-radius:8px;border:1px solid rgba(0,212,255,0.2)">
            <h2 style="color:#00d4ff;margin:0 0 16px">New Contact Message</h2>
            <p style="margin:0 0 8px"><strong style="color:#a855f7">From:</strong> ${escHtml(name)} &lt;${escHtml(email)}&gt;</p>
            ${subject ? `<p style="margin:0 0 8px"><strong style="color:#a855f7">Subject:</strong> ${escHtml(subject)}</p>` : ''}
            <hr style="border-color:rgba(255,255,255,0.1);margin:16px 0"/>
            <p style="white-space:pre-wrap;line-height:1.6">${escHtml(message)}</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}));
      return json({ error: (err as { message?: string }).message || 'Failed to send message.' }, 500);
    }

    // Save to DB (non-fatal)
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await admin.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || '',
        message: message.trim(),
        created_at: new Date().toISOString(),
        read: false,
      });
    } catch { /* non-fatal */ }

    return json({ ok: true });
  } catch (err) {
    console.error('contact failed:', err);
    return json({ error: 'Failed to send message.' }, 500);
  }
});
