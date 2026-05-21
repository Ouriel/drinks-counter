# MEMORY

## Internationalization (i18n)

- next-intl@4 with 6 locales: en, fr, de, es, ca, it
- Pages in `app/[locale]/`, API routes stay at `app/api/`
- Config: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`, `middleware.ts`
- Translation files: `messages/{locale}.json` (~175 keys each)
- LocaleSwitcher component on home page start screen
- next.config.ts uses `createNextIntlPlugin` wrapper
- Client pages: `useTranslations()`, server pages: `getTranslations()`
- Navigation: `useRouter` from `@/i18n/navigation` (locale-aware)

## Architecture

- Canonical types in `lib/types.ts` (Drink, MenuItem) — all components/hooks import from there
- `lib/useOptimisticDrinks.ts` — hook encapsulating drinks state, optimistic updates, undo, gamification
- Session page is 172 lines (down from 380) — uses the hook
- Home page (~290 lines) has 3 screens with shared state — intentionally kept in one file

## Performance

- TableView polling: 60s interval with visibility check
- `browser-image-compression` dynamically imported (only loaded on photo capture)

## Notifications

- All notifications use HeroUI `toast()` — single queued system (undo, badges, nudges, errors)
- `Toast.Provider` in layout.tsx with `placement="top"`
- Badge/nudge logic inline in useOptimisticDrinks hook (no useEffect)

## Components

- `DrinkCard` uses `react-aria` `useLongPress` (replaces manual timer logic)
- `PwaInstallPrompt` in layout.tsx (global), auto-dismisses after 8s, hidden in standalone PWA
- `TableView` syncs with parent `initialCode` prop changes
- Error boundary at `app/s/[slug]/error.tsx`

## API

- Slug collision logging in sessions POST
- Nominatim rate limited to 1 req/sec (server-side)
- Menu parse rate limited to 5 req/IP/min (in-memory, serverless caveat)

## useEffect Audit

- Home page: zero useEffects (geolocation is lazy in searchBars)
- Session page: 1 useEffect (initial data fetch — legitimate)
- DrinkPicker: 1 useEffect with stable deps (keyboard listener, onCloseRef pattern)
- TableView: 1 useEffect (polling interval — legitimate)
- PwaInstallPrompt: 1 useEffect (browser event — no alternative)

## Table Feature (v1.1)

- QR code in TableView, hidden behind "📱 Show QR code" button tap
- `/join/[code]` page: checks localStorage for existing session → creates if needed → joins table → redirects
- QR encodes `{origin}/join/{tableCode}`

## Vercel

- Project name: tipsytap, ID: prj_2BkzteZzM17LyjodP4H7IClxuZAZ, team: team_t0uk3Oakxc2hlttVfYirR47Z
- Zero runtime errors as of 2026-05-20
- All deployments READY, using turbopack bundler

## Code Review (2026-05-21)

### Fixed

- Math.max per-card O(n²) → compute once before map
- TableView setState during render → moved to useEffect
- Confetti onDone unstable dep → onDoneRef pattern
- totalRef drift on decrement → update totalRef in decrement()
- DrinkPicker aria-labelledby → added id + aria-labelledby
- Session page declaration order → useState first, then custom hook
- Abbreviated params → FIXED across all app/, components/, lib/ files
- gamification.test.ts type error (id on DrinkLike) → removed extra field
- titleCase test coverage → ADDED (3 tests, total now 69)

### Known/Accepted

- Slug entropy ~10K combos — collision retry loop (5 attempts) mitigates, sufficient for current scale
- No session expiry handling during active use — 48h TTL is generous for a night out

## Code Review #2 (2026-05-21)

### Open Issues (minor)

- `useOptimisticDrinks` temp ID uses `Date.now()` — sub-ms collision possible; use `crypto.randomUUID()`
- Summary page PB check uses `>=` instead of `===` — shows "Personal best!" on every visit, not just new records
- Admin page uses raw `fetch()` without Zod validation (convention violation, low-risk since admin-only)
- Rate limiters (Nominatim, parse-menu) reset on serverless cold starts — acceptable for current scale

### Verified Clean

- All conventions followed: strict TS, no any, canonical types, Zod at all API boundaries
- useEffect audit: all legitimate (DOM events, timers, initial fetch only)
- No abbreviated params anywhere
- Tests: 69 tests, all exercise real code, no db.ts imports, no placeholder assertions
- React patterns correct: onCloseRef, onDoneRef, declaration order, no derived-state useEffects
- Security: timingSafeEqual auth, Zod input validation on all routes, session ownership checks on PATCH
- Accessibility: aria-modal, aria-labelledby, keyboard trap in DrinkPicker, aria-labels on all buttons
