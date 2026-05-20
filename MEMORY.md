## Project

- TipsyTap: mobile-first drinks counter app
- Stack: Next.js 16 + TypeScript 6 + HeroUI v3 + Tailwind CSS 4 + Neon Postgres + Drizzle ORM
- Deploy: Vercel free tier, auto-deploy on push to main
- Repo: github.com/Ouriel/drinks-counter (private)
- URL: https://drinks-counter-rho.vercel.app
- Domain: tipsy-tap.vercel.app

## Current State (2026-05-20)

- App is live and functional
- AI menu parsing works (Gemini 2.5 Flash Lite, 15 RPM free)
- Multiple photo upload from gallery works
- Camera button opens camera directly (Android 14+ workaround)
- HeroUI v3 components (Button, Input, Card)
- Dark/light theme toggle (next-themes)
- Original Gemini logo (pint glass + question mark, dark bg)

## Recent Changes (2026-05-20)

### Categories

- `bar_menus.items` changed from `string[]` to `MenuItem[] ({name, category})`
- `normalizeMenuItems()` helper handles legacy string[] data gracefully (no migration needed)
- Category emojis: 🍺 beer, 🍷 wine, 🍸 cocktail, 🥃 spirit, 🥤 soft, 🍕 food, 🍹 other
- Emojis shown in: review step, session drink cards, picker groups, stats page

### OSM Bar Search

- `/api/bars/search` endpoint using Nominatim (free, no API key)
- Browser geolocation requested on mount, biases results near user
- Shows nearby bars/pubs/restaurants when no DB results found
- Falls back to existing DB fuzzy search

### Recent Sessions

- Stored in localStorage (`tipsytap_recent`, max 10 entries)
- Shown on start screen with bar name and date
- Saved on session creation — no DB bloat

### Share & Timer

- Share button (📤) in session page header, uses native share API, clipboard fallback
- Session timer computed from earliest drink's createdAt — no interval/constant tracking
- Shows "just started", "Xm", or "XhYm" next to slug

### Evening Summary

- `/s/[slug]/summary` — screenshot-friendly card layout
- Shows: total drinks, by-category breakdown, top 5 drinks, duration, bar name
- Share button with native share API
- Accessible from session page via "📊 Evening summary" button

### Stats Page

- Added drinks by category with emojis (simple GROUP BY query)

## Data Model

- `bar_menus`: permanent, shared. Bar name (sanitized, lowercase) + items (jsonb MenuItem[])
- `sessions`: personal, 48h TTL. Slug (unique) + optional bar_menu FK
- `drinks`: per-session. Name (lowercase) + count + optional category. Cascade delete with session

## AI

- Model: gemini-2.5-flash-lite (current free tier)
- Prompt: generic types when one of a kind, brand names when multiple variants, includes supplements (picon etc), splits combos, lowercase
- Returns: `{name, category}[]` with categories: beer, cocktail, wine, spirit, soft, food, other
- Image compression: browser-image-compression (web worker, max 1MB, 1600px)

## Key Files

- `lib/db.ts` — schema + normalizeMenuItems() helper
- `lib/sanitize.ts` — shared sanitization (bar names + drink names, both lowercase)
- `lib/ai.ts` — configurable provider (gemini/groq)
- `lib/slugs.ts` — 3-word slugs (adjective-noun-extra, 24K combos)
- `lib/theme-switch.tsx` — dark/light toggle
- `app/s/[slug]/summary/page.tsx` — evening summary (screenshot-friendly)
- `app/api/bars/search/route.ts` — OSM Nominatim bar search

## CI/CD

- Vitest: 20 tests
- ESLint 9 + Prettier
- Husky + lint-staged pre-commit
- GitHub Actions CI
- Dependabot weekly (grouped, majors ignored)
- drizzle-kit push runs at build time

## Env Vars (Vercel)

- POSTGRES_URL, GOOGLE_GENERATIVE_AI_API_KEY, AI_PROVIDER, ADMIN_SECRET, CRON_SECRET

## Health Connect / Fitbit Export

- Not implemented — requires native app or complex OAuth flows
- Alternative: screenshot-friendly summary page that users can share
- Could revisit with a "copy as text" export for manual logging in health apps
