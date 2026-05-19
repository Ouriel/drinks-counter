# CLAUDE.md — TipsyTap

## Project

Mobile-first drinks counter. Next.js 16 + TypeScript 6 + HeroUI v3 + Tailwind CSS 4 + Neon Postgres + Drizzle ORM.

## Commands

```bash
npm run dev          # Dev server (needs POSTGRES_URL in .env.local)
npm run build        # Production build (runs drizzle-kit push first)
npm test             # Vitest (20 tests)
npm run lint         # ESLint
npm run format:check # Prettier
```

## Architecture

- `app/page.tsx` — Home (new evening flow)
- `app/s/[slug]/page.tsx` — Session (drink counter)
- `app/admin/page.tsx` — Admin (manage bar menus, protected by ADMIN_SECRET)
- `app/stats/page.tsx` — Public stats
- `app/api/` — REST API (sessions, drinks, menus, parse-menu, admin, cron)
- `lib/db.ts` — Drizzle schema + DB connection
- `lib/ai.ts` — AI provider (gemini-2.5-flash-lite / groq)
- `lib/slugs.ts` — Fun slug generator (adjective-noun-extra)
- `lib/sanitize.ts` — Shared input sanitization
- `lib/theme-switch.tsx` — Dark/light toggle component

## Conventions

- All API routes validate inputs, return proper HTTP status codes
- Drink names are lowercased and matched case-insensitively
- PATCH /api/drinks requires slug + validates delta is exactly 1 or -1
- Use HeroUI components (Button, Input, Card) with theme tokens (bg-surface, text-muted)
- Use `onPress` not `onClick` for HeroUI Button
- Card pressable pattern: `<Card><button>...</button></Card>`
- Pre-commit: husky + lint-staged (eslint --fix + prettier)

## Key Constraints

- Vercel free tier (serverless functions, 4MB body limit)
- Gemini 2.5 Flash Lite (15 RPM, 1000 req/day free)
- Sessions expire after 48h (cron cleanup daily)
- Bar menus are permanent (shared across users)
- AI provider switchable via AI_PROVIDER env var
