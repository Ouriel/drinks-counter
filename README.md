# TipsyTap 🍻

Mobile-first web app to count drinks during a night out. Snap a bar menu photo, AI extracts drinks with categories, then tap to count throughout the evening.

## Features

- **AI Menu Scanning** — photograph a bar menu, Gemini extracts drinks with categories (beer, wine, cocktail, spirit, soft, food)
- **Bar Search** — fuzzy search existing bars in DB + OpenStreetMap/Nominatim for nearby places with geolocation
- **Drink Counter** — tap to increment, long press to decrement, haptic feedback
- **Categories** — emoji badges (🍺🍷🍸🥃🥤🍕) on all drink cards and in the picker
- **Session Timer** — elapsed time computed from first drink timestamp
- **Evening Summary** — screenshot-friendly card with totals, categories, top drinks, duration
- **Share** — native share API (mobile) or clipboard copy (desktop)
- **Recent Sessions** — localStorage history on the start screen
- **Dark/Light Theme** — toggle with next-themes
- **PWA Ready** — manifest, icons, mobile-optimized

## Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Framework  | Next.js 16 (App Router)                      |
| Language   | TypeScript 6                                 |
| UI         | HeroUI v3 + Tailwind CSS 4                   |
| Database   | Neon Postgres + Drizzle ORM                  |
| AI         | Vercel AI SDK + Google Gemini 2.5 Flash Lite |
| Deploy     | Vercel (free tier)                           |
| Test       | Vitest (70 tests)                            |
| Lint       | ESLint 9 + Prettier                          |
| Pre-commit | Husky + lint-staged                          |

## Architecture

```
app/
├── page.tsx                       # Home: new evening flow (bar search → photo → review)
├── s/[slug]/page.tsx              # Session: drink counter UI
├── s/[slug]/summary/page.tsx      # Evening summary (screenshot-friendly)
├── admin/page.tsx                 # Admin: manage bar menus
├── stats/page.tsx                 # Public stats (top drinks, categories)
└── api/
    ├── sessions/route.ts          # POST: create session, GET: session info
    ├── drinks/route.ts            # GET/POST/PATCH: drink CRUD
    ├── menus/route.ts             # GET: fuzzy bar menu search
    ├── bars/search/route.ts       # GET: OSM Nominatim bar search
    ├── parse-menu/route.ts        # POST: photo → AI → structured drinks
    ├── admin/route.ts             # Admin CRUD (protected)
    └── cron/cleanup/route.ts      # Expired session cleanup

lib/
├── db.ts                          # Drizzle schema + DB connection
├── menu-items.ts                  # MenuItem type + normalizeMenuItems()
├── ai.ts                          # Configurable AI provider (gemini/groq)
├── slugs.ts                       # Fun slug generator
├── sanitize.ts                    # Input sanitization
└── theme-switch.tsx               # Dark/light toggle
```

## Data Model

- **bar_menus** — permanent, shared. Bar name + items as `{name, category}[]`
- **sessions** — personal, 48h TTL. Slug URL = access token
- **drinks** — per-session. Name + count + category. Cascade delete with session

## Development

```bash
npm run dev          # Local dev server
npm run build        # Production build (includes drizzle-kit push)
npm test             # Run Vitest
npm run lint         # ESLint
npm run format:check # Prettier check
```

## Environment Variables

| Variable                       | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `POSTGRES_URL`                 | Neon Postgres connection string    |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini 2.5 Flash Lite              |
| `GROQ_API_KEY`                 | Alternative AI provider (optional) |
| `AI_PROVIDER`                  | "gemini" (default) or "groq"       |
| `ADMIN_SECRET`                 | Protects admin page                |
| `CRON_SECRET`                  | Protects cleanup cron              |

## License

GPL-3.0
