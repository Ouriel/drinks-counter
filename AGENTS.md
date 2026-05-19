# AGENTS.md — TipsyTap

## Overview

Mobile-first drinks counter app. Snap a bar menu photo, AI extracts drinks, tap to count throughout the evening. Each person gets a session via fun slug URL.

## Tech Stack

- Next.js 16 (App Router) + TypeScript 6
- HeroUI v3 + Tailwind CSS 4
- Neon Postgres + Drizzle ORM
- Vercel AI SDK + Google Gemini 2.5 Flash Lite (or Groq)
- Deployed on Vercel free tier

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build (must pass before pushing)
npm test             # Run all tests (must pass before pushing)
npm run lint         # ESLint check
npm run format:check # Prettier check
```

## Project Structure

```
app/                  # Next.js App Router pages and API routes
├── page.tsx          # Home: bar search → photo → review → create session
├── s/[slug]/         # Session: drink counter (tap +1, long-press -1)
├── admin/            # Admin: manage bar menus (protected)
├── stats/            # Public stats page
└── api/              # REST endpoints
lib/                  # Shared utilities
├── db.ts             # Drizzle schema + connection
├── ai.ts             # AI provider config
├── slugs.ts          # Slug generator
├── sanitize.ts       # Input sanitization (shared)
└── theme-switch.tsx  # Dark/light toggle
tests/                # Vitest unit tests
```

## Database Schema

- `bar_menus` — Permanent. Bar name (lowercase) + items (jsonb string array).
- `sessions` — 48h TTL. Slug (unique) + optional bar_menu FK.
- `drinks` — Per-session counts. Name (lowercase) + count. Cascade delete.

Schema auto-pushes on deploy: `drizzle-kit push` runs in build script.

## Rules

1. Run `npm test` and `npm run build` before committing
2. All API routes validate inputs and return proper HTTP status codes
3. Drink names are lowercased — matching is case-insensitive
4. PATCH /api/drinks validates delta is exactly 1 or -1
5. Use shared `lib/sanitize.ts` for all user input cleaning
6. Use HeroUI components + theme tokens (not hardcoded colors)
7. Keep the UI mobile-first — test at 375px width minimum
8. Never store secrets in code — use environment variables
9. Check library docs (Context7/web search) before assuming API versions or limits

## Environment Variables

- `POSTGRES_URL` — Neon database connection
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini 2.5 Flash Lite
- `GROQ_API_KEY` — Alternative AI provider
- `AI_PROVIDER` — "gemini" (default) or "groq"
- `ADMIN_SECRET` — Protects /admin and /api/admin
- `CRON_SECRET` — Protects cleanup cron endpoint
