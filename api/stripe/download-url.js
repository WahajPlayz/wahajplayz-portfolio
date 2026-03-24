import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getBucket, getDb } from '../_lib/admin.js';
import { getStoreProduct } from '../_lib/data.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) {
      return sendError(res, 401, 'You must be signed in to download this product.');
    }

    const body = await readJson(req);
    const productId = String(body.productId || req.query?.productId || '');
    if (!productId) {
      return sendError(res, 400, 'A productId is required.');
    }

    const product = await getStoreProduct(productId);
    if (!product || product.type !== 'digital') {
      return sendError(res, 404, 'Digital product not found.');
    }

    const userPurchase = await getDb().doc(`users/${decodedToken.uid}/digitalPurchases/${productId}`).get();
    if (!userPurchase.exists || userPurchase.data()?.status !== 'paid') {
      return sendError(res, 403, 'This account does not have access to that download.');
    }

    if (product.digitalFilePath) {
      const [url] = await getBucket().file(product.digitalFilePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 10,
      });
      return res.status(200).json({ url });
    }

    if (product.digitalFileUrl) {
      return res.status(200).json({ url: product.digitalFileUrl });
    }

    return sendError(res, 404, 'No digital file is attached to this product.');
  } catch (error) {
    console.error('download-url failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to fetch the download URL.');
  }
}
