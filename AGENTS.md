# AGENTS.md — TipsyTap

## Project Overview

Mobile-first drinks counter app. Users snap a bar menu photo, AI extracts drinks with categories, then they tap to count throughout the evening. Each session gets a fun slug URL (no auth).

## Stack

- Next.js 16 (App Router) + TypeScript 6 (strict: true)
- HeroUI v3 (Card, Button, Chip, Spinner, Input, toast) + Tailwind CSS 4
- Neon Postgres + Drizzle ORM
- Vercel AI SDK + Google Gemini 2.5 Flash Lite
- Vitest (66 tests), ESLint 9, Prettier, Husky

## Code Standards

### MUST DO

- All types in `lib/types.ts` — never define Drink/MenuItem locally
- All client fetches through `lib/api.ts` (Zod-validated responses)
- All notifications via HeroUI `toast()` — never custom toast UI
- No abbreviated params: `(event)` not `(e)`, `(item)` not `(d)`
- useEffect ONLY for: DOM events, timers, initial data fetch
- Run `npx prettier --write` on every modified file
- One component per file, named exports for lib/

### MUST NOT

- No `any` — strict mode enforced
- No useEffect for derived state or reacting to state changes
- No raw `fetch().json()` in components — use `api.*` helpers
- No placeholder tests (asserting inline math) — test real code paths
- No importing `lib/db.ts` in tests
- No custom notification overlays — use HeroUI toast system

## Architecture

```
lib/types.ts              → Canonical Drink, MenuItem types
lib/api.ts                → Typed fetch + Zod response schemas
lib/useOptimisticDrinks.ts → Hook: state + optimistic updates + undo + gamification
lib/schemas.ts            → Zod input validation for API routes
lib/gamification.ts       → Pure functions: badges, pace, nudges, achievements
components/DrinkCard.tsx  → react-aria useLongPress (not manual timers)
components/Confetti.tsx   → Milestone celebration animation
app/layout.tsx            → Toast.Provider + PwaInstallPrompt (global)
app/s/[slug]/error.tsx    → Error boundary
```

## Key Patterns

- **Optimistic updates**: `useOptimisticDrinks` hook handles all drink mutations with rollback
- **Gamification**: triggered inline in event handlers (not useEffect), fires confetti via `onBadge` callback
- **TableView**: syncs with parent prop changes, polls every 60s with visibility check
- **DrinkPicker**: keyboard trap with `onCloseRef` pattern (stable useEffect deps)
- **PwaInstallPrompt**: auto-dismiss 8s, hidden in standalone mode, in layout (global)
- **Geolocation**: lazy — only requested when OSM search triggers (not on mount)

## Commands

```bash
npm test             # 66 tests
npx tsc --noEmit    # Type check
npm run format:check # Prettier
npm run lint         # ESLint
```
