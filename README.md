# 🍻 TipsyTap

Tap to track the tipsy. Snap the bar menu, pick drinks, tap to count.

## Setup

1. Deploy to Vercel (connect this repo)
2. Add **Vercel Postgres** integration (free tier)
3. Get a free **Google AI API key** at https://aistudio.google.com/apikey
4. Add `GOOGLE_GENERATIVE_AI_API_KEY` to Vercel env vars
5. Run DB migration: `npx drizzle-kit push`

## Local dev

```bash
cp .env.example .env.local
# Fill in POSTGRES_URL and GOOGLE_GENERATIVE_AI_API_KEY
npx drizzle-kit push
npm run dev
```

## Stack

- Next.js 16 (App Router)
- TypeScript + Tailwind CSS
- Vercel Postgres + Drizzle ORM
- Google Gemini Flash (menu photo parsing)
