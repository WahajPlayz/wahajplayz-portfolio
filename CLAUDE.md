# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # TypeScript check + Vite production build (outputs to dist/)
npm run preview   # Preview production build locally
npm run deploy    # Build and deploy to GitHub Pages (gh-pages -d dist)
```

There are no tests in this project.

## Architecture

React 19 + TypeScript + Vite portfolio site deployed to GitHub Pages at `wahajplayz.org`.

**State & Auth:** `context/DataContext.tsx` wraps the entire app and manages all data plus Discord OAuth state. The `useData()` hook exposes everything. FAQ items are stored in localStorage (`wahaj_faq`). Roadmap data and user accounts live in **Firebase Firestore** for cross-device sync.

**Firebase / Firestore collections:**
- `discord_users/{discordId}` — `AppUser` records with `role`, `projectIds`, `avatar`, `username`, `createdAt`
- `requests/{discordId}` — `JoinRequest` records with `status: 'pending' | 'approved' | 'rejected'`
- `wahaj_data/roadmap` — single document holding the full roadmap array

**Discord OAuth:** Implicit grant flow (no backend). `lib/discord.ts` exports `redirectToDiscordOAuth()`, `parseDiscordTokenFromHash()`, `fetchDiscordUser()`, `getDiscordAvatarUrl()`. Token stored in localStorage, expires in 7 days. On load, DataContext parses the URL hash for a token, fetches the Discord user, then checks/creates their Firestore record and watches it for role changes.

**Role system:** `'owner' | 'admin' | 'member' | 'pending' | null`. Owner identified by matching `VITE_OWNER_DISCORD_ID` against the Discord user's numeric `id` or `username`. `openMemberPanel()` routes owner/admin to AdminPanel, others to MemberPanel.

**Hidden access triggers (no public buttons):**
- 20 clicks on `#IndieDev` tag in `components/About.tsx`
- Konami code (↑↑↓↓←→←→BA) listener in `App.tsx`
Both call `openMemberPanel()` which routes by role.

**Admin/Owner Panel:** `components/AdminPanel.tsx` — no login form; gated by `role === 'owner' | 'admin'`. Tabs: Roadmap (edit projects/sections/steps, inline rename, reorder), FAQ, Members (role + project assignment), Requests (pending Discord join requests with accept/reject). Owner sees Crown + "Owner Panel"; admin sees Shield + "Admin Panel". `buildAvatarUrl(discordId, avatar)` is a module-level helper (avoids naming conflict with a local `avatarUrl` variable inside the component).

**Member Panel:** `components/MemberPanel.tsx` — Discord login portal for team members. Shows pending screen if `role === 'pending'`. Members can manage only their assigned roadmap projects (add/remove sections/steps, toggle completion, reorder). Owner/admin are redirected to AdminPanel via `useEffect` if MemberPanel opens.

**Data Types:** `types.ts`. Roadmap: `RoadmapProject` → `RoadmapSection` → `RoadmapStep`. Auth: `AppUser { discordId, username, avatar, role, projectIds, createdAt }`, `JoinRequest { discordId, username, avatar, status, createdAt }`.

**Env vars required** (in `.env.local`):
```
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
VITE_DISCORD_CLIENT_ID, VITE_DISCORD_REDIRECT_URI, VITE_OWNER_DISCORD_ID
```

**Path Alias:** `@` resolves to the project root (e.g., `@/types`, `@/lib/discord`).

**Styling:** Tailwind CSS. Dark theme (`bg-black`, `text-white`). Icons from `lucide-react` and `bootstrap-icons`.

**File editing note:** The `Write` tool fails with `EEXIST` for files in OneDrive-synced directories. For complex multi-location edits, write a Node.js script to `C:/Users/wahaj/AppData/Local/Temp/` and run it with `node`.
