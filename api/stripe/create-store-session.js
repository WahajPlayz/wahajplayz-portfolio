import { applyCors, handleOptions } from '../_lib/cors.js';
import { verifyIdToken, getDb } from '../_lib/admin.js';
import { getStripe, getAppUrl, normalizeCurrency, buildPriceData } from '../_lib/stripe.js';
import { getStoreProduct, getSupportConfig } from '../_lib/data.js';
import { readJson, sendError } from '../_lib/http.js';

const ALL_SHIPPING_COUNTRIES = [
  'AC','AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO',
  'CR','CV','CW','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER',
  'ES','ET','FI','FJ','FK','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL',
  'GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HN','HR','HT','HU','ID',
  'IE','IL','IM','IN','IO','IQ','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI',
  'KM','KN','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV',
  'LY','MA','MC','MD','ME','MF','MG','MK','ML','MN','MO','MQ','MR','MS','MT','MU',
  'MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU',
  'NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PY','QA',
  'RE','RO','RS','RW','SA','SB','SC','SE','SG','SH','SI','SJ','SK','SL','SM','SN',
  'SO','SR','SS','ST','SV','SX','SZ','TA','TC','TD','TF','TG','TH','TJ','TK','TL',
  'TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE',
  'VG','VN','VU','WF','WS','XK','YE','YT','ZA','ZM','ZW','ZZ'
];

const applyDiscount = (price, percent) =>
  percent > 0 ? Math.round(price * (1 - percent / 100) * 100) / 100 : price;

const getAllowedShippingCountries = (product) => {
  if (product.type !== 'physical') return [];

  if (product.shippingCountryMode === 'only-selected') {
    return (product.allowedCountries || []).filter(Boolean);
  }

  const blocked = new Set((product.blockedCountries || []).filter(Boolean));
  return ALL_SHIPPING_COUNTRIES.filter((code) => !blocked.has(code));
};

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  applyCors(req, res);

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed.');
  }

  try {
    const decodedToken = await verifyIdToken(req.headers.authorization || '');
    if (!decodedToken?.uid) {
      return sendError(res, 401, 'You must be signed in to buy these products.');
    }

    const body = await readJson(req);
    const items = Array.isArray(body.items) ? body.items : [];
    const currency = normalizeCurrency(body.currency);
    if (items.length === 0) {
      return sendError(res, 400, 'At least one cart item is required.');
    }

    // Check per-tier membership discount — take the best discount across active tiers
    const db = getDb();
    let memberDiscount = 0;
    const membershipsSnap = await db.collection(`users/${decodedToken.uid}/memberships`).get();
    if (!membershipsSnap.empty) {
      const supportConfig = await getSupportConfig();
      const tiers = supportConfig?.membership?.tiers || [];
      for (const doc of membershipsSnap.docs) {
        const { tierId, status } = doc.data();
        if (status !== 'active') continue;
        const tier = tiers.find(t => t.id === tierId);
        if (tier?.storeDiscountPercent > 0) {
          memberDiscount = Math.max(memberDiscount, tier.storeDiscountPercent);
        }
      }
    }

    const cartItems = [];
    let allowedShippingCountries = null;
    for (const rawItem of items) {
      const productId = String(rawItem?.productId || '');
      const quantity = Math.max(1, Math.min(99, Number(rawItem?.quantity) || 1));
      const variantLabel = String(rawItem?.variantLabel || '');
      if (!productId) {
        return sendError(res, 400, 'Each cart item must include a productId.');
      }

      const product = await getStoreProduct(productId);
      if (!product || !product.enabled) {
        return sendError(res, 404, `Product ${productId} is not available for checkout.`);
      }
      if (product.stock === 0) {
        return sendError(res, 400, `${product.name} is out of stock.`);
      }
      if (product.stock !== null && quantity > product.stock) {
        return sendError(res, 400, `Only ${product.stock} of ${product.name} are available.`);
      }
      if (product.type === 'digital' && !product.digitalFilePath && !product.digitalFileUrl) {
        return sendError(res, 400, `${product.name} does not have a download attached.`);
      }

      if (product.type === 'digital') {
        await getDb().doc(`users/${decodedToken.uid}/digitalPurchases/${product.id}`).set({
          productId: product.id,
          productName: product.name,
          status: 'pending',
          updatedAt: Date.now(),
        }, { merge: true });
      }

      cartItems.push({ product, quantity, variantLabel });

      if (product.type === 'physical') {
        const productAllowedShippingCountries = getAllowedShippingCountries(product);
        if (productAllowedShippingCountries.length === 0) {
          return sendError(res, 400, `${product.name} does not have any shippable countries configured.`);
        }

        allowedShippingCountries = allowedShippingCountries
          ? allowedShippingCountries.filter((code) => productAllowedShippingCountries.includes(code))
          : productAllowedShippingCountries;
      }
    }

    if (allowedShippingCountries && allowedShippingCountries.length === 0) {
      return sendError(res, 400, 'The items in your cart do not share any shipping destinations.');
    }

    const stripe = getStripe();
    const origin = getAppUrl();
    const sessionConfig = {
      mode: 'payment',
      client_reference_id: decodedToken.uid,
      success_url: `${origin}/#/store?checkout=success`,
      cancel_url: `${origin}/#/store?checkout=cancel`,
      metadata: {
        kind: 'store',
        uid: decodedToken.uid,
        productIds: JSON.stringify(cartItems.map(item => item.product.id)),
      },
      line_items: await Promise.all(cartItems.map(async ({ product, quantity, variantLabel }) => {
        const salePrice = applyDiscount(product.price, product.salePercent || 0);
        const finalPrice = applyDiscount(salePrice, memberDiscount);
        const discountNote = memberDiscount > 0 ? ` [Member ${memberDiscount}% off]` : '';
        return {
          quantity,
          price_data: await buildPriceData({
            amountInBaseCurrency: finalPrice,
            currency,
            name: product.name,
            description: variantLabel ? `${product.description} (${variantLabel})${discountNote}` : `${product.description}${discountNote}`,
          }),
        };
      })),
      allow_promotion_codes: true,
    };

    if (allowedShippingCountries) {
      sessionConfig.billing_address_collection = 'required';
      sessionConfig.phone_number_collection = { enabled: true };
      sessionConfig.shipping_address_collection = {
        allowed_countries: allowedShippingCountries,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('create-store-session failed', error);
    return sendError(res, 500, error instanceof Error ? error.message : 'Failed to create store checkout session.');
  }
}
