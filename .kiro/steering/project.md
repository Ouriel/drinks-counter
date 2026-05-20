---
inclusion: always
---

# Drinks Counter — Project Context

## Overview

Mobile-first web app to count drinks during a night out. Users snap a bar menu photo, AI extracts drink names with categories, then they tap to count throughout the evening. Each person gets their own session via a fun slug URL.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: HeroUI v3 + Tailwind CSS 4
- **Database**: Neon Postgres + Drizzle ORM
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash Lite (or Groq as alternative)
- **Deploy**: Vercel free tier
- **Test**: Vitest (26 tests)
- **Lint**: ESLint + Prettier
- **Pre-commit**: Husky + lint-staged

## Architecture

```
app/
├── page.tsx                       # Home: new evening flow (bar search → photo → review)
├── layout.tsx                     # Root layout, PWA meta
├── s/[slug]/page.tsx              # Session page: drink counter UI
├── s/[slug]/summary/page.tsx      # Evening summary (screenshot-friendly)
├── s/[slug]/error.tsx             # Error boundary
├── s/[slug]/loading.tsx           # Loading state
├── admin/page.tsx                 # Admin: manage bar menus (ADMIN_SECRET)
├── stats/page.tsx                 # Public stats
└── api/
    ├── sessions/route.ts          # POST: create session, GET: session info + menu
    ├── drinks/route.ts            # GET/POST/PATCH: drink CRUD with ownership checks
    ├── menus/route.ts             # GET: fuzzy bar menu search (DB)
    ├── bars/search/route.ts       # GET: OSM Nominatim bar search (geolocation)
    ├── parse-menu/route.ts        # POST: photo → AI → structured drink list
    ├── admin/route.ts             # GET/PATCH/DELETE: admin CRUD (protected)
    └── cron/cleanup/route.ts      # GET: delete expired sessions (daily cron)
lib/
├── db.ts                          # Drizzle schema (bar_menus, sessions, drinks)
├── menu-items.ts                  # MenuItem type + normalizeMenuItems() (testable)
├── ai.ts                          # Configurable AI provider (gemini/groq)
├── slugs.ts                       # Fun slug generator (adjective-noun-extra)
├── sanitize.ts                    # Shared input sanitization
└── theme-switch.tsx               # Dark/light toggle component
```

## Data Model

- `bar_menus`: permanent, shared. Bar name (sanitized, lowercase) + items (jsonb `MenuItem[]`)
- `sessions`: personal, 48h TTL. Slug (unique) + optional bar_menu FK.
- `drinks`: per-session. Name (lowercase) + count + optional category. Cascade delete with session.
- `MenuItem`: `{ name: string; category: string }` — categories: beer, cocktail, wine, spirit, soft, food, other

## Key Design Decisions

- No authentication — the slug URL IS the access token
- Menu items stored as `{name, category}[]` in DB. Legacy `string[]` handled by `normalizeMenuItems()`
- PATCH endpoint requires slug for ownership verification
- AI provider switchable via `AI_PROVIDER` env var
- Input sanitization on all user inputs — shared in lib/sanitize.ts
- Drink names lowercased and matched case-insensitively
- Fuzzy search: multi-token ILIKE with AND logic
- OSM Nominatim for bar search (free, no API key, geolocation-biased)
- Recent sessions in localStorage (no DB bloat, max 10)
- Session timer computed from first drink timestamp (no interval)

## HeroUI v3 Conventions

- `Card` with `<button>` inside for pressable cards (no `isPressable` prop)
- `Chip` for category emoji badges
- `Spinner` for loading states
- `Button` uses `onPress` not `onClick`
- Variants: `primary`, `ghost`

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm test             # Run Vitest (26 tests)
npm run lint         # ESLint
npm run format:check # Prettier check
npx drizzle-kit push # Push schema to DB
```

## Mandatory: Verify Before Diagnosing

When something fails (API error, build error, runtime error):

1. **Read the actual error message completely** — don't truncate or guess
2. **Check the library's current documentation** via Context7 or web search BEFORE proposing a fix
3. **Never assume model names, API versions, or rate limits from memory** — always verify against current docs
4. **If the error mentions a quota/limit/version**: check the provider's current pricing/limits page FIRST
5. **One diagnosis attempt max** before checking docs — if the first fix doesn't work, STOP and research

## Environment Variables

- `POSTGRES_URL` — Neon Postgres connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini 2.5 Flash Lite (default AI provider)
- `GROQ_API_KEY` — Alternative AI provider
- `AI_PROVIDER` — "gemini" (default) or "groq"
- `ADMIN_SECRET` — Protects admin page and API
- `CRON_SECRET` — Protects the cleanup cron endpoint
