# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (frontend only)
npm run dev:api      # Start Vercel dev server for API functions on port 3001
npm run build        # TypeScript check + Vite production build (outputs to dist/)
npm run preview      # Preview production build locally
npm run deploy       # Build and deploy to GitHub Pages (gh-pages -d dist)
```

There are no tests in this project.

## Architecture

React 19 + TypeScript + Vite portfolio site at `wahajplayz.org`. Entry point is `index.tsx` at the project root — all source files (`App.tsx`, `types.ts`, `components/`, `context/`, `lib/`, `pages/`, `sections/`, `hooks/`, `config/`) live at the root, not in a `src/` directory. Uses **HashRouter** for routing.

**Routing:** `App.tsx` wraps all providers and defines routes: `/` (main landing page), `/posts`, `/profile`, `/membership`, `/donate`, `/donate/success`, `/store`, `/store/:productId`, `/download`, `/messages`. Page components are lazy-loaded from `pages/`.

**Loading screen:** A pre-React branded overlay lives in `index.html` (shows logo + "Loading up [page name]" before JS loads). `index.tsx` wraps `<App>` in `<AppWithLoader>` which fades out the overlay after React mounts (minimum 600ms display). `components/PageTransition.tsx` handles route-change transitions (logo overlay for ~750ms on every navigation).

**Provider stack** (outermost → innermost): `DataProvider` → `CurrencyProvider` → `AuthProvider` → `SupportProvider` → `StoreProvider` → `CartProvider`.

**Contexts:**
- `context/DataContext.tsx` (`useData()`) — Discord OAuth state, roadmap/FAQ data, admin/member panel open state, user/request management
- `context/AuthContext.tsx` (`useAuth()`) — Supabase Google OAuth (sign in/out, auth modal open state)
- `context/CurrencyContext.tsx` (`useCurrency()`) — 41-currency display; auto-detects from IP via `ipapi.co/json/`; fetches live rates from `open.er-api.com` (30-min cache); stored in localStorage (`wahaj_currency`). Zero-decimal currencies (JPY, KRW, etc.) are stored as integers in Stripe.
- `context/SupportContext.tsx` (`useSupportData()`) — owner-configured goals, membership tiers, donation settings, posts, admin permissions; live-synced from Supabase via `postgres_changes` realtime subscription
- `context/StoreContext.tsx` (`useStore()`) — store product catalog and settings from Supabase
- `context/CartContext.tsx` (`useCart()`) — shopping cart state with variant tracking (color, type, size, custom answers), quantity management; calls `startStoreCheckout()` from `lib/stripeCheckout.ts`; opens auth modal if user not signed in

## Backend: Supabase

**`lib/supabase.ts`** — creates the Supabase client, exports `ensureAuth()` (signs in anonymously if no session, required before every write) and `getAuthToken()` (JWT for API Bearer headers). Every save function in `SupportContext` and `StoreContext` calls `await ensureAuth()` before writing.

**Auth:** Two auth systems coexist:
1. **Google OAuth** (`context/AuthContext.tsx`) — required for purchasing and gated content. Uses `supabase.auth.signInWithOAuth()`.
2. **Anonymous session** (`lib/supabase.ts` → `ensureAuth()`) — called automatically before every write so RLS policies (`auth.role() = 'authenticated'`) pass without requiring Google login (used by AdminPanel saves).

**Supabase tables:**
- `support_config` — single row holding `OwnerConfig` (goals, tiers, posts, donation settings, adminPermissions); `SupportContext` streams changes via `postgres_changes`
- `store_config` — single row holding `StoreConfig` (products, categories, headings)
- `discord_users` — `AppUser` records (`role`, `projectIds`, `avatar`, `username`, `createdAt`, optional `adminPermissions`). Pending join requests are `role: 'pending'` — no separate requests table.
- `memberships` — user tier subscriptions written by Stripe webhook; read by `hooks/useUserMemberships.ts`
- `digital_purchases` — user→product records (`status: 'pending'|'paid'`, `grantedAt`); read by `hooks/useDigitalPurchases.ts`
- `transactions`, `donations`, `stripe_subscriptions` — payment history written by webhook
- `contact_messages` — contact form submissions written by `api/contact.js`
- `conversations` + `conversations_messages` — buyer-seller messaging

**Note on roadmap data:** Roadmap still uses a Supabase table/document (check `DataContext` for current source — may differ from `support_config`).

## Discord OAuth

Implicit grant flow (no backend). `lib/discord.ts` exports `redirectToDiscordOAuth()`, `parseDiscordTokenFromHash()`, `fetchDiscordUser()`, `getDiscordAvatarUrl()`. Token stored in localStorage, expires in 7 days. On load, `DataContext` parses the URL hash for a Discord token, fetches the user, ensures Supabase anonymous auth, then checks/creates their `discord_users` record and watches it for role changes.

**Role system:** `'owner' | 'admin' | 'member' | 'pending' | null`. Owner identified by matching `VITE_OWNER_DISCORD_ID` against the Discord user's numeric `id` or `username`.

## Hidden Access Triggers

No public UI exists for these:
- 20 clicks on `#IndieDev` tag in `components/About.tsx` → `openMemberPanel()` (routes by role)
- 20 clicks on `#Unity3D` tag in `components/About.tsx` → `openAdmin()` (always shows AdminPanel + password gate)
- Konami code (↑↑↓↓←→←→BA) in `App.tsx` → `openMemberPanel()`
- **Password login:** `VITE_ADMIN_PASSWORD` env var. Correct password sets `localAuth = true`, stored as `wahaj_owner_verified` in localStorage.

## Panels

**AdminPanel** (`components/AdminPanel.tsx`): Tabs — Roadmap, FAQ, Members, Requests, Goal Bar, Membership, Posts, Donations, Store, Permissions (owner-only). Owner = Crown + "Owner Panel"; admin = Shield + "Admin Panel". `AdminPermissions` interface in `config/ownerConfig.ts` controls per-tab access for admins; stored in `support_config`.

**MemberPanel** (`components/MemberPanel.tsx`): Discord login portal. Shows spinner while `authLoading` OR while `discordUser` set but `role === null && !portalSyncError`. Members manage only their assigned roadmap projects. Owner/admin redirected to AdminPanel via `useEffect`.

**CartDrawer** (`components/CartDrawer.tsx`): Right-side slide-out drawer (z-index 130) with quantity controls, item preview, subtotal. Hides the support button when open.

## Content & Commerce

**Post visibility:** `'public' | 'members' | 'tier-specific'` with `allowedTiers: string[]`. `pages/Posts.tsx`, `pages/Membership.tsx`, and `sections/PostsFeed.tsx` use `hooks/useUserMemberships.ts` to check `hasTier(id)` / `hasAnyTier(ids[])`. Locked posts show tier badge and upgrade button.

**Membership page** (`pages/Membership.tsx`): Shows goal bar, tier cards, and filterable posts grid. Non-members see blurred cover + lock icon.

**Digital download flow:** After a successful Stripe purchase, user lands on `/download?product=X&session_id=Y`. `pages/Download.tsx` calls `api/stripe/verify-digital-session.js` to confirm payment, then `api/stripe/download-url.js` to get a signed Supabase Storage URL (or static URL). Auto-triggers download, auto-closes after 3.2s. `TEST_PRODUCT` constant in that file allows testing without a real purchase.

**Contact system:** `components/ContactModal.tsx` — floating button (bottom-left), POSTs to `api/contact.js` which emails via Resend and stores in `contact_messages`. Supports Ctrl+Enter.

**Buyer-seller messaging:** `pages/Messages.tsx` — two-panel layout. Requires Google Auth. Three endpoints in `api/messages/`: `conversations.js`, `thread.js`, `send.js`. All require Supabase JWT in `Authorization: Bearer`.

## API Layer (`api/` — Vercel serverless)

Shared utilities in `api/_lib/`:
- `admin.js` — Supabase admin client (service role key); verifies JWTs server-side
- `stripe.js` — Stripe SDK, currency normalization (base GBP), exchange rate logic, minor-unit conversion
- `data.js` — DB queries: fetch products/config, record transactions, grant digital purchases, update memberships
- `cors.js` — origin whitelist + preflight handling
- `http.js` — `sendJson`, `sendError`, `readJson`

Stripe endpoints in `api/stripe/`:
- `create-store-session.js` — cart items with member discounts, shipping if physical
- `create-membership-session.js` — monthly/yearly/lifetime recurring billing
- `create-donation-session.js` — one-time donation with optional message
- `create-billing-portal-session.js` — manage subscriptions
- `verify-digital-session.js` — check payment status & ownership
- `download-url.js` — issue signed Supabase Storage URL or proxy static URL
- `webhook.js` — handles `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → records transactions, grants digital purchases, updates memberships, increments donation goal

**Client-side Stripe:** `lib/stripeCheckout.ts` posts to `VITE_STRIPE_API_BASE` + route with Supabase JWT in `Authorization: Bearer`. Includes retry logic (3 attempts) for token refresh.

## Asset Storage

`lib/githubStorage.ts` — uploads assets to a GitHub repository via a Supabase Edge Function (`supabase/functions/upload/index.ts`), which converts the file to base64 and calls the GitHub REST API. `lib/cloudinary.ts` is an alternative/legacy path. AdminPanel calls `compressImage()` (Canvas API, max 1920px, 82% JPEG quality, skips <300KB) before every `uploadAsset()` call. Upload progress shown via `membershipUploadStatus` / `postUploadStatus` / `storeUploadStatus` state.

## Hooks

- `hooks/useUserMemberships.ts` — realtime listener for user's `memberships` rows; exposes `hasTier(id)`, `hasAnyTier(ids[])`
- `hooks/useDigitalPurchases.ts` — realtime listener for user's `digital_purchases` rows; exposes `purchases` array and `loading`
- `hooks/useCurrency.ts` — re-exports `useCurrency` from `CurrencyContext`

## Config & Types

- `config/ownerConfig.ts` — `OwnerConfig`, `AdminPermissions`, `defaultAdminPermissions`, `Tier`, `Post`, `Attachment` (fallback defaults overridden by Supabase at runtime)
- `config/storeConfig.ts` — `StoreConfig`, `StoreProduct`, `COUNTRIES` (fallback defaults)
- `types.ts` — `RoadmapProject` → `RoadmapSection` → `RoadmapStep`, `AppUser`, `JoinRequest`, `FAQItem`

## Env Vars

```
# Frontend (VITE_*)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
VITE_DISCORD_CLIENT_ID, VITE_DISCORD_REDIRECT_URI, VITE_OWNER_DISCORD_ID
VITE_STRIPE_API_BASE   # Base URL for Vercel API (e.g. https://your-vercel-app.vercel.app)
VITE_ADMIN_PASSWORD    # Password for admin panel without Discord

# API / Vercel serverless
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
APP_URL               # e.g. https://www.wahajplayz.org
RESEND_API_KEY        # Email (contact form + messaging)
OWNER_EMAIL           # Destination for contact form emails
GITHUB_TOKEN, GITHUB_REPO, GITHUB_OWNER   # Asset uploads via Edge Function
```

## Misc

**Path Alias:** `@` resolves to the project root (e.g., `@/types`, `@/lib/discord`).

**Styling:** Tailwind CSS. Dark theme (`#0d0e12`). Global neon CSS variables (`--cyan`, `--purple`, `--pink`) and keyframes (`glow-pulse`, `float`, `logo-pulse`, `dot-blink`) are defined in `index.html`'s `<style>` block — reference them by name in React component inline styles. Icons from `lucide-react` and `bootstrap-icons`.

**File editing note:** The `Write` tool may fail with `EEXIST` for files in OneDrive-synced directories. For complex multi-location edits, write a Node.js script to `C:/Users/wahaj/AppData/Local/Temp/` and run it with `node`.
