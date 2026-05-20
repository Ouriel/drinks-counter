# AGENTS.md — TipsyTap

## Project Overview

Mobile-first drinks counter app. Users snap a bar menu photo, AI extracts drinks with categories, then they tap to count throughout the evening. Each session gets a fun slug URL (no auth).

## Stack

- Next.js 16 (App Router) + TypeScript 6
- HeroUI v3 (Card, Button, Chip, Spinner, Input) + Tailwind CSS 4
- Neon Postgres + Drizzle ORM
- Vercel AI SDK + Google Gemini 2.5 Flash Lite
- Vitest, ESLint 9, Prettier, Husky

## Key Conventions

- **HeroUI v3 patterns**: Card with `<button>` inside for pressable cards (no `isPressable` prop). Use `Chip` for category badges. Use `Spinner` for loading states. Button uses `onPress` not `onClick`.
- **Data normalization**: `bar_menus.items` is `MenuItem[]` (`{name, category}`). Legacy data may be `string[]` — always use `normalizeMenuItems()` from `lib/menu-items.ts` when reading.
- **Input sanitization**: All user inputs go through `lib/sanitize.ts`. Bar names and drink names are lowercased.
- **No auth**: The slug URL IS the access token. PATCH endpoints verify slug ownership.
- **Categories**: beer, cocktail, wine, spirit, soft, food, other. Emojis: 🍺🍸🍷🥃🥤🍕🍹.
- **Tests**: Pure logic in separate files (not in db.ts) to avoid DB connection in tests.

## File Structure

```
lib/db.ts           — Schema + DB connection (don't import in tests)
lib/menu-items.ts   — MenuItem type + normalizeMenuItems (safe to import in tests)
lib/sanitize.ts     — Input sanitization
lib/ai.ts           — AI provider config
lib/slugs.ts        — Slug generation
lib/theme-switch.tsx — Theme toggle component
```

## Commands

```bash
npm run dev          # Dev server
npm test             # 26 tests
npm run lint         # ESLint
npm run format:check # Prettier
npx tsc --noEmit    # Type check
```

## Important Notes

- `drizzle-kit push` runs at build time — schema changes auto-apply on deploy
- Vercel serverless body limit is 4.5MB — images compressed client-side to 1MB
- Android 14+ Chrome: camera needs separate `capture="environment"` input
- OSM Nominatim: 1 req/sec rate limit, User-Agent required
- Gemini free tier: 15 RPM, 1000 req/day
