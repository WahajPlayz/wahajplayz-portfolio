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

**Routing:** `App.tsx` wraps providers and defines routes: `/` (main landing page), `/posts`, `/profile`, `/membership`, `/donate`, `/store`, `/download`. Page components are lazy-loaded from `pages/`.

**Provider stack** (outermost → innermost): `DataProvider` → `CurrencyProvider` → `AuthProvider` → `SupportProvider` → `StoreProvider`.

**Contexts:**
- `context/DataContext.tsx` (`useData()`) — Discord OAuth state, roadmap/FAQ data, admin/member panel open state, user/request management
- `context/AuthContext.tsx` (`useAuth()`) — Firebase Google Auth (sign in/out, auth modal open state)
- `context/CurrencyContext.tsx` (`useCurrency()`) — 41-currency display; auto-detects from IP via `ipapi.co/json/` (`data.currency`); fetches live rates from `open.er-api.com`; stored in localStorage (`wahaj_currency`)
- `context/SupportContext.tsx` (`useSupportData()`) — owner-configured goals, membership tiers, donation settings, posts, admin permissions; live-synced from Firestore via `onSnapshot`
- `context/StoreContext.tsx` (`useStore()`) — store product catalog and settings from Firestore

**Firebase / Firestore collections:**
- `discord_users/{discordId}` — `AppUser` records (`role`, `projectIds`, `avatar`, `username`, `createdAt`, optional `adminPermissions`)
- `wahaj_data/roadmap` — single document holding the full roadmap array (`{ projects: RoadmapProject[] }`)
- `wahaj_data/support` — `OwnerConfig` (goal, membership tiers, donation settings, posts, adminPermissions)
- `wahaj_data/store` — `StoreConfig` (products, categories, headings)
- `users/{uid}/memberships/{tierId}` — membership records written by Stripe webhook; read by `hooks/useUserMemberships.ts`

**Note:** Pending join requests are stored as `discord_users/{discordId}` records with `role: 'pending'` — there is no separate `requests` collection.

**Firebase Auth:** Two separate auth systems coexist:
1. **Google Auth** (`context/AuthContext.tsx`) — required for purchasing and gated content. Uses `signInWithPopup`.
2. **Anonymous Auth** (`lib/firebase.ts` → `ensureStorageAuth()`) — called automatically before every Firestore/Storage write so the security rules (`request.auth != null`) pass. This is the auth that allows the admin panel to save data without requiring a Google login.

**Required Firestore security rules** (set in Firebase Console, not deployed via CLI — no `firestore.rules` file exists):
```
match /wahaj_data/{document} { allow read: if true; allow write: if request.auth != null; }
match /discord_users/{discordId} { allow read, write: if request.auth != null; }
match /users/{userId} { allow read: if request.auth != null; match /memberships/{m} { allow read: if request.auth.uid == userId; allow write: if request.auth != null; } }
```
Similarly for Storage rules. Both snippets are also embedded in `components/AdminPanel.tsx` as `STORAGE_RULES_SNIPPET` and `FIRESTORE_RULES_SNIPPET` for easy copy-paste from the panel.

**Firestore persistence:** `lib/firebase.ts` uses `initializeFirestore(app, { localCache: persistentLocalCache() })` — writes commit locally first (<100ms), then sync to server in the background. Every save function in `SupportContext` and `StoreContext` calls `await ensureStorageAuth()` before `setDoc`.

**Discord OAuth:** Implicit grant flow (no backend). `lib/discord.ts` exports `redirectToDiscordOAuth()`, `parseDiscordTokenFromHash()`, `fetchDiscordUser()`, `getDiscordAvatarUrl()`. Token stored in localStorage, expires in 7 days. On load, DataContext parses the URL hash for a token, fetches the Discord user, ensures Firebase anonymous auth, then checks/creates their Firestore record and watches it for role changes.

**Role system (Discord):** `'owner' | 'admin' | 'member' | 'pending' | null`. Owner identified by matching `VITE_OWNER_DISCORD_ID` against the Discord user's numeric `id` or `username`.

**Hidden access triggers (no public buttons):**
- 20 clicks on `#IndieDev` tag in `components/About.tsx` → calls `openMemberPanel()` (routes by role)
- 20 clicks on `#Unity3D` tag in `components/About.tsx` → calls `openAdmin()` directly (always shows AdminPanel + password gate, works without Discord)
- Konami code (↑↑↓↓←→←→BA) listener in `App.tsx` → calls `openMemberPanel()`

**Password-based owner login:** `VITE_ADMIN_PASSWORD` env var. When AdminPanel opens and no Discord/role auth is present, it shows a password form. Correct password sets `localAuth = true` which bypasses role checks. Session key stored as `wahaj_owner_verified` in localStorage.

**Admin/Owner Panel** (`components/AdminPanel.tsx`): Tabs: Roadmap, FAQ, Members, Requests, Goal Bar, Membership, Posts, Donations, Store, and Permissions (owner-only). Owner sees Crown + "Owner Panel"; admin sees Shield + "Admin Panel".

**Admin Permissions system:** `AdminPermissions` interface in `config/ownerConfig.ts` — a boolean flag per tab (`roadmap`, `faq`, `members`, `requests`, `goal`, `membership`, `posts`, `donation`, `store`). Stored in `wahaj_data/support` as `adminPermissions`. Owner can toggle per-tab access for all admins via the Permissions tab. `defaultAdminPermissions` has all tabs enabled. When `isOwner` is false, tabs where `config.adminPermissions[tab] === false` are hidden.

**Member Panel** (`components/MemberPanel.tsx`): Discord login portal. Shows spinner while `authLoading` OR while `discordUser` is set but `role === null && !portalSyncError` (covers the anonymous auth gap). Shows "Syncing Team Access" error only when `portalSyncError` is set. Members manage only their assigned roadmap projects. Owner/admin redirected to AdminPanel via `useEffect`.

**Post visibility:** `'public' | 'members' | 'tier-specific'` with `allowedTiers: string[]`. `pages/Posts.tsx` and `sections/PostsFeed.tsx` use `hooks/useUserMemberships.ts` to check `hasTier(id)` / `hasAnyTier(ids[])`. Locked posts show tier name badge and upgrade button.

**Image uploads:** `compressImage()` in AdminPanel (Canvas API, max 1920px, 82% JPEG quality, skips files <300KB) is called before every `uploadAsset()`. Progress shown via `membershipUploadStatus` / `postUploadStatus` / `storeUploadStatus` state.

**Stripe / Payments:** Serverless functions in `api/stripe/` (Vercel). Client calls go through `lib/stripeCheckout.ts` posting to `VITE_STRIPE_API_BASE` + route. Firebase Auth ID tokens sent as `Authorization: Bearer`. `api/_lib/stripe.js` handles currency conversion (base GBP, 30-min cache). `api/_lib/admin.js` verifies Firebase ID tokens server-side.

**Config files:** `config/ownerConfig.ts` — `OwnerConfig`, `AdminPermissions`, `defaultAdminPermissions`, `Tier`, `Post`, `Attachment`. `config/storeConfig.ts` — `StoreConfig`, `StoreProduct`, `COUNTRIES`. Both are fallback defaults overridden by Firestore at runtime.

**Data Types:** `types.ts` — `RoadmapProject` → `RoadmapSection` → `RoadmapStep`, `AppUser` (includes optional `adminPermissions`), `JoinRequest`, `FAQItem`.

**Env vars required** (frontend in `.env.local`, API in Vercel env):
```
# Frontend (VITE_*)
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
VITE_DISCORD_CLIENT_ID, VITE_DISCORD_REDIRECT_URI, VITE_OWNER_DISCORD_ID
VITE_STRIPE_API_BASE   # Base URL for API calls (e.g. https://your-vercel-app.vercel.app)
VITE_ADMIN_PASSWORD    # Password for admin panel access without Discord

# API / Vercel serverless
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
APP_URL   # e.g. https://www.wahajplayz.org
```

**Path Alias:** `@` resolves to the project root (e.g., `@/types`, `@/lib/discord`).

**Styling:** Tailwind CSS. Dark theme (background `#0d0e12`). Icons from `lucide-react` and `bootstrap-icons`.

**File editing note:** The `Write` tool may fail with `EEXIST` for files in OneDrive-synced directories. For complex multi-location edits, write a Node.js script to `C:/Users/wahaj/AppData/Local/Temp/` and run it with `node`.
