# Stripe Checkout Setup

This project now uses:

- GitHub Pages for the frontend
- Vercel API routes for Stripe checkout + webhooks
- Firebase Auth / Firestore / Storage for user identity, purchases, and digital downloads

## 1. Frontend env

Set this in your local `.env.local` before building GitHub Pages:

```powershell
VITE_STRIPE_API_BASE=https://YOUR-VERCEL-PROJECT.vercel.app
```

For local API testing with Vercel dev:

```powershell
VITE_STRIPE_API_BASE=http://127.0.0.1:3001
```

## 2. Vercel env

Add these environment variables in Vercel:

```txt
APP_URL=https://www.wahajplayz.orgdi
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_STORAGE_BUCKET=...
ALLOWED_ORIGINS=https://wahajplayz.org,https://www.wahajplayz.org
```

Important:
- `FIREBASE_PRIVATE_KEY` must keep the `\n` escapes when pasted into Vercel.
- `APP_URL` should match the public GitHub Pages domain users return to after checkout.

## 3. Local testing

Frontend:

```powershell
npm run dev
```

API:

```powershell
npm run dev:api
```

## 4. Stripe webhook

Point Stripe to:

```txt
https://YOUR-VERCEL-PROJECT.vercel.app/api/stripe/webhook
```

Listen for:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.deleted`

## 5. Live publish flow

Deploy the API to Vercel first.

Then build/publish the frontend to GitHub Pages with:

```powershell
npm run deploy
```

## 6. What each flow now does

- Donations:
  - no site login required
  - dynamic Stripe Checkout in the selected currency
- Membership:
  - requires site login
  - dynamic Stripe Checkout in the selected currency
  - recurring monthly/yearly uses Stripe subscriptions
- Store:
  - requires site login
  - dynamic Stripe Checkout in the selected currency
  - digital files unlock after verified paid checkout
