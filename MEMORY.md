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
- HeroUI v3 components (Button, Input, Card, Chip, Spinner)
- Dark/light theme toggle (next-themes)
- Original Gemini logo (pint glass + question mark, dark bg)
- Commit 3e10b92 pushed to main, Vercel auto-deploying

## Recent Changes (2026-05-20)

### Admin Page Fix

- Fixed [object Object] display: admin page now handles MenuItem[] properly
- Edit mode uses structured rows: Input (drink name) + native select (category) + ✕ delete per row
- "Add item" button to append new rows
- Bar name is editable in edit mode (Input field above items list)
- HeroUI v3 Select is too complex (React Aria primitives), used styled native `<select>` instead

### Bug Fixes

- Expired session summary shows friendly message + "New evening" button instead of empty state
- Replaced alert() with ErrorToast component (fixed position, auto-dismiss, closeable)
- Race condition: pendingOps ref prevents server reconciliation during rapid taps

### UX Improvements

- Drink picker: "Already ordered" section moved to TOP for quick +1
- Drink cards show visual `+` affordance on the right
- Bar search: shows "No results — take a photo!" guidance when empty
- QR code modal (📱 button) for sharing session with friends at the table
- Copy as text button on summary page (formatted drink list for group chats)
- PWA install prompt (beforeinstallprompt, dismissible, session-persisted)

### Code Quality

- Extracted CATEGORY_EMOJI + CATEGORIES to `lib/constants.ts` (was duplicated in 4 files)
- Extracted DrinkCard and DrinkPicker to `components/` directory
- Rate limiting on /api/parse-menu: 5 requests/IP/minute (in-memory)
- Added `qrcode-generator` dependency for QR code SVG generation

### Cron Cleanup

- Configured in vercel.json: daily at 06:00 UTC (`/api/cron/cleanup`)
- **NOT running** — no logs in last 7 days. Likely needs Vercel Pro plan or CRON_SECRET not set.

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

## Code Quality Review (2026-05-20)

- ✅ FIXED: Admin route PATCH/DELETE now uses adminPatchSchema + UUID validation
- ✅ FIXED: Slug fields have regex constraint /^[a-z0-9-]+$/ + reserved path blocklist
- ✅ FIXED: drinks.sort() in summary page no longer mutates state ([...drinks].sort())
- ✅ FIXED: PATCH race condition resolved with atomic SQL (DELETE WHERE count<=1, UPDATE WHERE count>1)
- ✅ FIXED: error.tsx/loading.tsx use theme-aware bg-background/text-foreground
- ✅ FIXED: Stats page runs 6 queries in parallel with Promise.all
- ✅ FIXED: DrinkPicker modal has role="dialog", aria-modal, aria-label
- ✅ FIXED: Review step inputs have aria-label
- ✅ FIXED: Slug space kept at 24K (3-part format) — sufficient with 48h TTL + cron cleanup
- ✅ FIXED: Bar menu items capped at 200
- ✅ FIXED: Timer extracted to ElapsedTimer component (no full page re-render)
- Slug test updated to match new 4-part format

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

## Code Review (2026-05-20)

- Admin PATCH/DELETE: no input validation (adminPatchSchema defined but unused)
- Slug schema: no regex constraint, allows any characters (XSS/route collision risk)
- summary/page.tsx: `drinks.sort()` mutates React state directly
- PATCH race: concurrent -1 on count=2 can leave count=0 (never deleted)
- error.tsx/loading.tsx: hardcoded dark colors, ignores theme
- Stats page: 5 sequential DB queries (should be Promise.all)
- DrinkPicker: missing role="dialog" aria-modal
- Slug space: only 24,576 combos (32×32×24), 5 retries
- Bar menu items: grow unbounded via POST drinks (no cap)
- Timer setInterval re-renders entire session page every 60s
