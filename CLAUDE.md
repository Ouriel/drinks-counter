# CLAUDE.md — TipsyTap

## Quick Context

Drinks counter PWA. Next.js 16 + HeroUI v3 + Neon Postgres + Gemini AI.

## Before Making Changes

1. Run `npx tsc --noEmit` to verify types
2. Run `npm test` (26 tests, Vitest)
3. Run `npx eslint . --ext .ts,.tsx`
4. Run `npx prettier --check "**/*.{ts,tsx}"`

## Key Rules

- Use HeroUI v3 compound components: `Card` with `<button>` inside, `Chip` for badges, `Spinner` for loading
- Button uses `onPress` not `onClick`
- Never import `lib/db.ts` in test files (triggers DB connection). Use `lib/menu-items.ts` for pure logic.
- All drink/bar names are lowercased via `lib/sanitize.ts`
- `normalizeMenuItems()` handles legacy `string[]` → `MenuItem[]` conversion
- Categories: beer, cocktail, wine, spirit, soft, food, other
- Sessions expire after 48h. Slug = access token (no auth).

## Architecture

- `app/page.tsx` — Home (start → bar search → photo → review → create session)
- `app/s/[slug]/page.tsx` — Session counter (tap +1, long press -1)
- `app/s/[slug]/summary/page.tsx` — Evening summary (screenshot-friendly)
- `app/api/bars/search/route.ts` — OSM Nominatim (geolocation-biased)
- `app/api/parse-menu/route.ts` — AI menu extraction
- `lib/menu-items.ts` — `MenuItem` type + `normalizeMenuItems()`
