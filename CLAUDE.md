# CLAUDE.md — Drinks Counter

## Project

Mobile-first drinks counter app. Next.js 16 + TypeScript + Tailwind CSS 4 + Vercel Postgres + Drizzle ORM.

## Commands

```bash
npm run dev          # Dev server (needs POSTGRES_URL in .env.local)
npm run build        # Production build
npm test             # Vitest (22 tests)
npm run lint         # ESLint
npm run format:check # Prettier check
```

## Architecture

- `app/page.tsx` — Home page (new evening flow)
- `app/s/[slug]/page.tsx` — Session page (drink counter)
- `app/api/` — REST API routes (sessions, drinks, menus, parse-menu, cron)
- `lib/db.ts` — Drizzle schema + DB connection
- `lib/ai.ts` — Configurable AI provider (gemini/groq)
- `lib/slugs.ts` — Fun slug generator

## Conventions

- All API routes validate inputs, return proper HTTP status codes
- Optimistic UI updates, server sync after
- Input sanitization on all user inputs (bar names: 100 chars, drink names: 80 chars)
- No authentication — slug URL = access token
- PATCH requires slug for ownership verification
- Tests in `tests/` directory, run with Vitest
- Pre-commit: husky + lint-staged (eslint --fix + prettier)

## Key Constraints

- Vercel free tier only (no heavy dependencies, serverless functions)
- Photo upload max 4MB (Vercel serverless body limit)
- Sessions expire after 48h (cron cleanup daily)
- Bar menus are permanent (shared across users)
- AI provider switchable via AI_PROVIDER env var without code changes
