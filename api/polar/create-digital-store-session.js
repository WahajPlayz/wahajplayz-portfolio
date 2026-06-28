import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getPolar, getAppUrl, resolveCurrency, buildPolarPricesArray } from '../_lib/polar.js';
import { getStoreProduct, saveStoreProductPolarId } from '../_lib/data.js';
import { readJson, sendError } from '../_lib/http.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed.');

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) return sendError(res, 401, 'You must be signed in.');

    const { items, currency: currencyRaw, pricesByCurrencyPerItem } = await readJson(req);
    const userCurrency = resolveCurrency(currencyRaw);
    if (!Array.isArray(items) || items.length === 0)
      return sendError(res, 400, 'Cart is empty.');

    const uid = decodedToken.uid;
    const resolvedItems = [];

    for (const item of items) {
      const product = await getStoreProduct(item.productId);
      if (!product) return sendError(res, 404, `Product not found: ${item.productId}`);
      if (product.type !== 'digital') return sendError(res, 400, `Only digital products are supported: ${product.name}`);
      if (!product.enabled) return sendError(res, 400, `Product is not available: ${product.name}`);
      if (!product.price || product.price <= 0) {
        return sendError(res, 400, `"${product.name}" has no price set — set a price in the admin panel before selling it.`);
      }
      resolvedItems.push({ product, quantity: Math.min(Math.max(1, item.quantity || 1), 99), variantLabel: item.variantLabel || '' });
    }

    // Create pending digital_purchases before checkout (same as Stripe flow)
    for (const { product } of resolvedItems) {
      await getDb().from('digital_purchases').upsert({
        user_id: uid,
        product_id: product.id,
        product_name: product.name,
        digital_file_name: product.digitalFileName || '',
        status: 'pending',
        updated_at: Date.now(),
      });
    }

    const polar = getPolar();

    // For each cart item: build multi-currency prices.
    // If polarProductId is missing → auto-create the Polar product and save the ID.
    // If present → update the existing product's prices with fresh exchange rates.
    let anyCurrencyAvailable = false;
    const polarProductIds = [];

    for (const { product } of resolvedItems) {
      const map = pricesByCurrencyPerItem?.[product.id];
      const prices = map ? buildPolarPricesArray(map) : [];

      // Fall back to a single GBP price if frontend didn't send a map for this item.
      const finalPrices = prices.length > 0
        ? prices
        : [{
            amountType: 'fixed',
            priceAmount: Math.round((product.price || 0) * 100),
            priceCurrency: 'gbp',
          }];

      if (finalPrices.some((p) => p.priceCurrency === userCurrency)) anyCurrencyAvailable = true;

      let polarProductId = product.polarProductId;
      if (!polarProductId) {
        const created = await polar.products.create({
          name: product.name,
          prices: finalPrices,
        });
        polarProductId = created.id;
        await saveStoreProductPolarId(product.id, polarProductId);
      } else {
        await polar.products.update({ id: polarProductId, productUpdate: { prices: finalPrices } });
      }
      polarProductIds.push(polarProductId);
    }

    const firstProductId = resolvedItems[0].product.id;
    const origin = getAppUrl();
    const checkoutCurrency = anyCurrencyAvailable ? userCurrency : 'gbp';

    const checkout = await polar.checkouts.create({
      products: polarProductIds,
      currency: checkoutCurrency,
      externalCustomerId: uid,
      metadata: {
        kind: 'store',
        uid,
        productIds: JSON.stringify(resolvedItems.map(({ product }) => product.id)),
        productNames: JSON.stringify(resolvedItems.map(({ product }) => product.name)),
        variantLabels: JSON.stringify(resolvedItems.map(({ variantLabel }) => variantLabel)),
        quantities: JSON.stringify(resolvedItems.map(({ quantity }) => quantity)),
      },
      successUrl: `${origin}/#/download?checkout_id={CHECKOUT_ID}&product=${encodeURIComponent(firstProductId)}`,
      returnUrl: `${origin}/#/store`,
    });

    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    console.error('polar create-digital-store-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create store checkout.');
  }
}
