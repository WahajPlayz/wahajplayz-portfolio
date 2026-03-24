cc# Repository Guidelines

## Project Structure & Module Organization
The main app is a Vite + React + TypeScript site rooted at [App.tsx](/H:/wahaj/OneDrive/wahajplayz-portfolio/App.tsx) and [index.tsx](/H:/wahaj/OneDrive/wahajplayz-portfolio/index.tsx). Reusable UI lives in [components](/H:/wahaj/OneDrive/wahajplayz-portfolio/components), route-level screens in [pages](/H:/wahaj/OneDrive/wahajplayz-portfolio/pages), larger homepage sections in [sections](/H:/wahaj/OneDrive/wahajplayz-portfolio/sections), and shared state in [context](/H:/wahaj/OneDrive/wahajplayz-portfolio/context) and [hooks](/H:/wahaj/OneDrive/wahajplayz-portfolio/hooks). Config and service helpers live in [config](/H:/wahaj/OneDrive/wahajplayz-portfolio/config) and [lib](/H:/wahaj/OneDrive/wahajplayz-portfolio/lib). Static assets go in [public](/H:/wahaj/OneDrive/wahajplayz-portfolio/public). Stripe and other serverless endpoints live in [api](/H:/wahaj/OneDrive/wahajplayz-portfolio/api); Firebase Functions source is in [functions/src](/H:/wahaj/OneDrive/wahajplayz-portfolio/functions/src).

## Build, Test, and Development Commands
Use `npm run dev` to start the Vite frontend locally. Use `npm run dev:api` to run Vercel serverless routes on port 3001 when working on checkout, downloads, or webhooks. Use `npm run build` to produce the production bundle in `dist/`, and `npm run preview` to smoke-test that build. Deployment helpers include `npm run deploy` for the static site and `cd functions && npm run build` for Firebase Functions.

## Coding Style & Naming Conventions
Write TypeScript with 2-space indentation and keep existing React function-component patterns. Use `PascalCase` for components and page files (`DonationPanel.tsx`), `camelCase` for hooks and helpers (`useCurrency.ts`, `stripeCheckout.ts`), and keep config values grouped in typed modules. Prefer small, focused files over large mixed-purpose components. No ESLint or Prettier config is checked in, so match the surrounding style closely.

## Testing Guidelines
There is no automated test suite configured yet. Before opening a PR, run `npm run build` and manually verify the affected flows in local dev, especially Stripe donation, membership, store, and download paths. If you add tests later, place them next to the feature or under a dedicated `tests/` folder and name them `*.test.ts` or `*.test.tsx`.

## Commit & Pull Request Guidelines
Recent commits use short, informal summaries, but contributors should prefer clear imperative messages such as `Add Stripe download verification` or `Fix membership redirect`. Keep commits scoped to one change. PRs should include a brief description, any required env or config changes, linked issues when available, and screenshots for UI updates. Note any manual checks you ran.

## Security & Configuration Tips
Do not commit secrets from `.env.local` or `vercel.env`. Keep `.env.example` updated when adding required variables. Treat Stripe, Firebase Admin, and Discord-related keys as server-only unless a value is explicitly intended for the client.
