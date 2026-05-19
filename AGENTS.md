# AGENTS.md — Drinks Counter

## Overview

Mobile-first web app to count drinks during a night out. Users snap a bar menu photo, AI extracts drink names, then they tap to count. Each person gets their own session via a fun slug URL.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Vercel Postgres + Drizzle ORM
- Vercel AI SDK + Google Gemini Flash / Groq
- Deployed on Vercel free tier

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build (must pass before pushing)
npm test             # Run all tests (must pass before pushing)
npm run lint         # ESLint check
npm run format:check # Prettier check
npm run format       # Auto-format all files
```

## Project Structure

```
app/                  # Next.js App Router pages and API routes
├── page.tsx          # Home: bar search → photo → review → create session
├── s/[slug]/         # Session: drink counter UI (tap +1, long-press -1)
└── api/              # REST endpoints
lib/                  # Shared utilities (db schema, AI config, slug generator)
tests/                # Vitest unit tests
public/               # Static assets + PWA manifest
```

## Database Schema (Drizzle ORM)

- `bar_menus` — Permanent. Bar name + items (jsonb string array).
- `sessions` — 48h TTL. Slug (unique) + optional bar_menu FK.
- `drinks` — Per-session counts. Cascade delete with session.

Push schema changes: `npx drizzle-kit push`

## Rules

1. Run `npm test` and `npm run build` before committing
2. All API routes must validate inputs and return proper HTTP status codes
3. PATCH /api/drinks requires `slug` param for ownership verification
4. Sanitize all user inputs (bar names: 100 chars max, drink names: 80 chars max)
5. No new dependencies without justification (Vercel free tier constraints)
6. Keep the UI mobile-first — test at 375px width minimum
7. Optimistic UI updates on the client, server sync after
8. Never store secrets in code — use environment variables

## Environment Variables

- `POSTGRES_URL` — Database connection
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini Flash
- `GROQ_API_KEY` — Alternative AI provider
- `AI_PROVIDER` — "gemini" (default) or "groq"
- `CRON_SECRET` — Protects cleanup endpoint
