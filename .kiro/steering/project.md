---
inclusion: always
---

# Drinks Counter — Project Context

## Overview

Mobile-first web app to count drinks during a night out. Users snap a bar menu photo, AI extracts drink names with categories, then they tap to count throughout the evening. Each person gets their own session via a fun slug URL.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 6 (strict mode)
- **Styling**: HeroUI v3 + Tailwind CSS 4
- **Database**: Neon Postgres + Drizzle ORM
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash Lite (or Groq as alternative)
- **Deploy**: Vercel free tier
- **Test**: Vitest (66 tests)
- **Lint**: ESLint + Prettier
- **Pre-commit**: Husky + lint-staged

## Architecture

```
app/
├── page.tsx                       # Home: new evening flow (bar search → photo → review)
├── layout.tsx                     # Root layout, Toast.Provider, PwaInstallPrompt
├── s/[slug]/page.tsx              # Session page: drink counter UI
├── s/[slug]/summary/page.tsx      # Evening summary (screenshot-friendly)
├── s/[slug]/error.tsx             # Error boundary
├── admin/page.tsx                 # Admin: manage bar menus (ADMIN_SECRET)
├── stats/page.tsx                 # Public stats
└── api/
    ├── sessions/route.ts          # POST: create session, GET: session info + menu
    ├── drinks/route.ts            # GET/POST/PATCH: drink CRUD with ownership checks
    ├── menus/route.ts             # GET: fuzzy bar menu search (DB)
    ├── bars/search/route.ts       # GET: OSM Nominatim bar search (rate-limited 1/sec)
    ├── parse-menu/route.ts        # POST: photo → AI → structured drink list
    ├── admin/route.ts             # GET/PATCH/DELETE: admin CRUD (protected)
    └── cron/cleanup/route.ts      # GET: delete expired sessions (daily cron)
lib/
├── types.ts                       # Canonical types: Drink, MenuItem
├── api.ts                         # Typed fetch client with Zod response validation
├── useOptimisticDrinks.ts         # Hook: drinks state + optimistic updates + gamification
├── db.ts                          # Drizzle schema (bar_menus, sessions, drinks, tables)
├── schemas.ts                     # Zod input validation for API routes
├── menu-items.ts                  # normalizeMenuItems() with runtime JSONB validation
├── gamification.ts                # Badges, pace, nudges, achievements (pure functions)
├── ai.ts                          # Configurable AI provider (gemini/groq)
├── slugs.ts                       # Fun slug generator (adjective-noun)
├── sanitize.ts                    # Shared input sanitization
├── nicknames.ts                   # Animal nickname generator for tables
├── constants.ts                   # Category emoji map
├── auth.ts                        # timingSafeEqual secret verification
└── theme-switch.tsx               # Dark/light toggle component
components/
├── DrinkCard.tsx                   # Tap/long-press card (react-aria useLongPress)
├── DrinkPicker.tsx                 # Modal drink search/add
├── TableView.tsx                   # Table ranking (create/join/leaderboard)
├── Confetti.tsx                    # Celebration animation on milestones
├── QrCode.tsx                      # QR code generator
└── PwaInstallPrompt.tsx            # Install banner (auto-dismiss, hidden in standalone)
```

## Code Conventions (MUST FOLLOW)

### TypeScript

- `strict: true` — zero `any` allowed
- Use `type` not `interface`
- All API responses validated with Zod at runtime (lib/api.ts)
- Canonical types in `lib/types.ts` — never define Drink/MenuItem locally

### React Patterns

- **useEffect ONLY for**: DOM event subscriptions, timers/intervals, initial data fetch in client components
- **NEVER useEffect for**: derived state, reacting to state changes, triggering side effects from events
- Use refs (`onCloseRef` pattern) to stabilize callback deps in useEffects
- Declaration order: useState → custom hooks → variables → useMemo → useCallback → useEffect
- One component per file

### Naming

- **No abbreviated parameters**: `(event)` not `(e)`, `(item)` not `(d)`, `(word)` not `(w)`
- Named exports for lib/ files (pages use default export as required by Next.js)

### Notifications

- Use HeroUI `toast()` for ALL notifications (undo, badges, nudges, errors)
- Never build custom toast/notification UI — use the framework's built-in
- Confetti component for visual celebration on milestones only

### API Client

- All client-side fetches go through `lib/api.ts` typed helpers
- Never raw `fetch()` + `.json()` in components — always `api.getDrinks()`, `api.createSession()`, etc.
- API responses are Zod-validated at runtime — catches contract drift immediately

### Testing

- Test pure logic functions (gamification, sanitize, schemas, slugs, auth, normalizeMenuItems)
- Don't write placeholder tests that assert inline math — every test must exercise real code
- Don't import `lib/db.ts` in tests (triggers DB connection)

## HeroUI v3 Conventions

- `Card` with `<button>` inside for pressable cards (no `isPressable` prop)
- `Chip` for category emoji badges
- `Spinner` for loading states
- `Button` uses `onPress` not `onClick`
- `toast()` / `toast.danger()` / `toast.success()` for notifications
- `Toast.Provider` in layout.tsx
- `useLongPress` from `react-aria` for long-press interactions

## Data Model

- `bar_menus`: permanent, shared. Bar name (sanitized, lowercase) + items (jsonb `MenuItem[]`)
- `sessions`: personal, 48h TTL. Slug (unique) + optional bar_menu FK + optional table FK
- `drinks`: per-session. Name (lowercase) + count + optional category. Cascade delete with session.
- `tables`: shared group. 6-char code. Members get animal nicknames.
- `MenuItem`: `{ name: string; category: string }` — categories: beer, cocktail, wine, spirit, shot, mocktail, soft, food, other

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build (needs POSTGRES_URL)
npm test             # Run Vitest (66 tests)
npm run lint         # ESLint
npm run format:check # Prettier check
npx tsc --noEmit    # Type check
npx drizzle-kit push # Push schema to DB
```

## Environment Variables

- `POSTGRES_URL` — Neon Postgres connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini 2.5 Flash Lite (default AI provider)
- `GROQ_API_KEY` — Alternative AI provider
- `AI_PROVIDER` — "gemini" (default) or "groq"
- `ADMIN_SECRET` — Protects admin page and API
- `CRON_SECRET` — Protects the cleanup cron endpoint
