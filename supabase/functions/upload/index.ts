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

  const GITHUB_TOKEN = Deno.env.get('GITHUB_STORAGE_TOKEN');
  const GITHUB_OWNER = Deno.env.get('GITHUB_STORAGE_OWNER');
  const GITHUB_REPO = Deno.env.get('GITHUB_STORAGE_REPO');
  const BRANCH = 'main';

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return json({ error: 'GitHub storage not configured on server.' }, 500);
  }

  try {
    const { content, filename, folder } = await req.json();
    if (!content || !filename || !folder) {
      return json({ error: 'Missing required fields: content, filename, folder.' }, 400);
    }

    const slug = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}_${slug}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const ghRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: `Upload ${filename}`, content, branch: BRANCH }),
    });

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({}));
      return json({ error: (err as { message?: string }).message || `GitHub upload failed (${ghRes.status})` }, 500);
    }

    const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${BRANCH}/${path}`;
    return json({ url, path });
  } catch (err) {
    console.error('upload failed:', err);
    return json({ error: 'Upload failed.' }, 500);
  }
});
