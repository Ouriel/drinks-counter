---
inclusion: always
---

# Drinks Counter — Project Context

## Overview

Mobile-first web app to count drinks during a night out. Users snap a bar menu photo, AI extracts drink names, then they tap to count throughout the evening. Each person gets their own session via a fun slug URL.

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Vercel Postgres + Drizzle ORM
- **AI**: Vercel AI SDK + Google Gemini Flash (or Groq as alternative)
- **Deploy**: Vercel free tier
- **Test**: Vitest
- **Lint**: ESLint + Prettier
- **Pre-commit**: Husky + lint-staged

## Architecture

```
app/
├── page.tsx                    # Home: new evening flow (bar search → photo → review)
├── layout.tsx                  # Root layout, PWA meta
├── s/[slug]/page.tsx           # Session page: drink counter UI
├── s/[slug]/error.tsx          # Error boundary
├── s/[slug]/loading.tsx        # Loading state
└── api/
    ├── sessions/route.ts       # POST: create session, GET: session info + menu
    ├── drinks/route.ts         # GET/POST/PATCH: drink CRUD with ownership checks
    ├── menus/route.ts          # GET: fuzzy bar menu search
    ├── parse-menu/route.ts     # POST: photo → AI → structured drink list
    └── cron/cleanup/route.ts   # GET: delete expired sessions (daily cron)
lib/
├── db.ts                       # Drizzle schema (bar_menus, sessions, drinks)
├── ai.ts                       # Configurable AI provider (gemini/groq)
└── slugs.ts                    # Fun slug generator (adjective-noun-number)
```

## Data Model

- `bar_menus`: permanent, shared. Bar name (sanitized, lowercase) + items (jsonb string array).
- `sessions`: personal, 48h TTL. Slug (unique) + optional bar_menu FK.
- `drinks`: per-session. Name + count + optional category. Cascade delete with session.

## Key Design Decisions

- No authentication — the slug URL IS the access token
- Menu items stored in DB (not localStorage) for durability
- PATCH endpoint requires slug for ownership verification
- AI provider switchable via `AI_PROVIDER` env var
- Input sanitization on all user inputs (bar names, drink names)
- Fuzzy search: multi-token ILIKE with AND logic

## Conventions

- All API routes validate inputs and return proper HTTP status codes
- Optimistic UI updates on the client, followed by server sync
- Haptic feedback on tap actions (`navigator.vibrate`)
- Long press (500ms) for decrement, single tap for increment
- Toast with undo for all count changes (3s auto-dismiss)

## Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm test             # Run Vitest (22 tests)
npm run lint         # ESLint
npm run format:check # Prettier check
npx drizzle-kit push # Push schema to DB
```

## Environment Variables

- `POSTGRES_URL` — Vercel Postgres connection string
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini Flash (default AI provider)
- `GROQ_API_KEY` — Alternative AI provider
- `AI_PROVIDER` — "gemini" (default) or "groq"
- `CRON_SECRET` — Protects the cleanup cron endpoint
