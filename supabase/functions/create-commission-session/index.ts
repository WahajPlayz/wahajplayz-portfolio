import Stripe from 'npm:stripe@14';

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

  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  if (!STRIPE_SECRET_KEY) return json({ error: 'Stripe not configured on server.' }, 500);

  try {
    const { serviceName, basePrice, description, contact, returnOrigin } = await req.json();

    if (!serviceName?.trim()) return json({ error: 'Service name is required.' }, 400);
    if (!description?.trim()) return json({ error: 'Description is required.' }, 400);
    if (!contact?.trim()) return json({ error: 'Contact info is required.' }, 400);
    if (!basePrice || Number(basePrice) <= 0) return json({ error: 'A valid price is required.' }, 400);

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const origin = (returnOrigin || 'https://wahajplayz.org').replace(/\/$/, '');
    const amountPence = Math.round(Number(basePrice) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/#/commissions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/commissions`,
      metadata: {
        kind: 'commission',
        service: String(serviceName).trim().slice(0, 200),
        description: String(description).trim().slice(0, 500),
        contact: String(contact).trim().slice(0, 200),
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: amountPence,
          product_data: {
            name: `Commission: ${String(serviceName).trim()}`,
            description: String(description).trim().slice(0, 200),
          },
        },
      }],
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-commission-session failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Failed to create checkout session.' }, 500);
  }
});
