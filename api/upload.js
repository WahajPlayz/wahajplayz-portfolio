import { applyCors, handleOptions } from './_lib/cors.js';
import { readJson, sendError, sendJson } from './_lib/http.js';
import { verifyIdToken } from './_lib/admin.js';

const GITHUB_TOKEN = process.env.GITHUB_STORAGE_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_STORAGE_OWNER;
const GITHUB_REPO = process.env.GITHUB_STORAGE_REPO;
const BRANCH = 'main';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  const user = await verifyIdToken(req.headers.authorization);
  if (!user) return sendError(res, 401, 'Unauthorized.');

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return sendError(res, 500, 'GitHub storage not configured on server.');
  }

  const { content, filename, folder } = await readJson(req);
  if (!content || !filename || !folder) {
    return sendError(res, 400, 'Missing required fields: content, filename, folder.');
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
    return sendError(res, 500, err.message || `GitHub upload failed (${ghRes.status})`);
  }

  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${BRANCH}/${path}`;
  return sendJson(res, 200, { url, path });
}
