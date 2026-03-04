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

**State Management:** A single `DataContext` (`context/DataContext.tsx`) wraps the entire app and manages all dynamic data (FAQ items, Roadmap projects). State is persisted to `localStorage` under keys `wahaj_faq` and `wahaj_roadmap_v2`. The `useData()` hook provides access throughout the component tree.

**Admin Panel:** `components/AdminPanel.tsx` is a password-protected modal (triggered by a hidden mechanism) that allows live editing of FAQ entries and Roadmap projects/sections/steps. Authentication state is stored in `localStorage` under `wahaj_auth`. The panel is rendered at the root level in `App.tsx` and conditionally shown via `isAdminOpen`.

**Data Types:** Defined in `types.ts`. The Roadmap has a 3-level hierarchy: `RoadmapProject` → `RoadmapSection` → `RoadmapStep`.

**Path Alias:** `@` resolves to the project root (e.g., `@/types`, `@/context/DataContext`).

**Styling:** Tailwind CSS utility classes throughout. Dark theme (`bg-black`, `text-white`). Icons from `lucide-react` and `bootstrap-icons`.

**No build-time data fetching** — all content is either hardcoded as initial state in `DataContext.tsx` or stored in localStorage.
