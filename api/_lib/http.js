import admin from 'firebase-admin';

const json = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
};

export const readJson = json;

export const readRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export const sendJson = (res, status, payload) => {
  res.status(status).json(payload);
};

export const sendError = (res, status, message, details) => {
  const payload = { error: message };
  if (details) payload.details = details;
  res.status(status).json(payload);
};

export const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
