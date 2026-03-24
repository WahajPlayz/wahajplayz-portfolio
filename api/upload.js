import { verifyIdToken } from './_lib/admin.js';

const GITHUB_TOKEN = process.env.GITHUB_STORAGE_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_STORAGE_OWNER;
const GITHUB_REPO = process.env.GITHUB_STORAGE_REPO;
const BRANCH = 'main';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require Firebase auth (anonymous auth is fine)
  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { content, filename, folder } = req.body;
  if (!content || !filename || !folder) {
    return res.status(400).json({ error: 'Missing required fields: content, filename, folder' });
  }

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GitHub storage not configured on server' });
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
    return res.status(500).json({ error: err.message || `GitHub upload failed (${ghRes.status})` });
  }

  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${BRANCH}/${path}`;
  return res.status(200).json({ url, path });
}
