# 🍻 TipsyTap

Tap to track the tipsy. Snap the bar menu, pick drinks, tap to count.

## Features

- 📷 Snap menu photos → AI extracts drink names (Gemini 2.5 Flash Lite)
- 🍺 Tap to count, long-press to remove
- 🔍 Fuzzy bar search — reuse menus others already scanned
- 🔗 Fun session URLs (`/s/tipsy-negroni-thunder`)
- 🌙 Dark/light theme
- 📱 PWA — installable on mobile
- ⏰ Sessions auto-expire after 48h

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 6
- **UI**: HeroUI v3 + Tailwind CSS 4
- **Database**: Neon Postgres + Drizzle ORM
- **AI**: Vercel AI SDK + Google Gemini 2.5 Flash Lite
- **Deploy**: Vercel (free tier)
- **Test**: Vitest · **Lint**: ESLint + Prettier · **CI**: GitHub Actions

## Setup

1. Deploy to Vercel (connect this repo)
2. Add **Neon Postgres** storage (Storage tab)
3. Set environment variables:
   - `GOOGLE_GENERATIVE_AI_API_KEY` — from https://aistudio.google.com/apikey
   - `ADMIN_SECRET` — any password for `/admin`
   - `CRON_SECRET` — any string for cleanup cron
4. Schema auto-pushes on deploy (`drizzle-kit push` in build script)

## Local dev

```bash
cp .env.example .env.local
# Fill in POSTGRES_URL and GOOGLE_GENERATIVE_AI_API_KEY
npm install
npm run dev
```

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build (includes drizzle-kit push)
npm test             # Vitest
npm run lint         # ESLint
npm run format:check # Prettier
```
