## Project

- Drinks Counter: mobile-first app to count drinks during a night out
- Stack: Next.js 16 + TypeScript 6 + Tailwind CSS 4 + Neon Postgres + Drizzle ORM + Gemini Flash
- Deploy: Vercel free tier, auto-deploy on push to main
- Repo: github.com/Ouriel/drinks-counter (private)
- URL: https://drinks-counter-rho.vercel.app

## Data Model

- `bar_menus`: permanent, shared across users (bar_name + items jsonb)
- `sessions`: personal, 48h TTL, identified by fun slug in URL (`/s/tipsy-negroni-thunder`)
- `drinks`: per-session counts, cascade delete with session

## Features (V1)

- Bar name search → reuse existing menu or snap new photo
- AI menu parsing (Gemini Flash or Groq, configurable via AI_PROVIDER)
- Tap-to-count main screen (only shows YOUR drinks)
- Unified search/add picker (type to search or add custom)
- Undo toast on each action
- Long press = decrement (with hint text)
- Custom drinks saved to bar menu for future users
- Menu merge on re-scan (no duplicates, case-insensitive)
- Daily cron cleanup of expired sessions
- Admin page (/admin) with session persistence
- Public stats page (/stats)
- Session code input on home page for resume
- Non-existing slug redirects to create flow with that slug

## AI Provider

- Configurable via `AI_PROVIDER` env var: "gemini" (default) or "groq"
- Gemini: `GOOGLE_GENERATIVE_AI_API_KEY` (free: 15 RPM, 1M tokens/day)
- Groq: `GROQ_API_KEY` (free: 30 RPM, 14.4K req/day, llama-3.2-90b-vision)
- Image sent as Uint8Array + mediaType to AI SDK v6

## Security

- Cron endpoint protected with `CRON_SECRET` Bearer token
- PATCH endpoint verifies drink belongs to session (ownership check)
- Photo upload limited to 4MB client-side
- Drink names sanitized to 80 chars
- Admin protected by `ADMIN_SECRET` env var
- No secrets exposed to frontend (no NEXT_PUBLIC_ vars)
- Slug = access token (URL-is-auth pattern)

## PWA

- manifest.json with display: standalone
- Apple Web App meta tags
- Theme color #030712
- touch-manipulation on body

## Accessibility

- aria-label on all interactive elements
- role="dialog" + aria-modal on picker
- role="status" + aria-live="polite" on toast
- Haptic feedback (navigator.vibrate)
- Focus-visible rings on buttons/inputs
- Safe area insets for iPhone

## Input Sanitization

- Bar names: trim, lowercase, remove emojis/special chars, keep accents/hyphens/apostrophes, 100 char max
- Fuzzy search: multi-token ILIKE with AND logic
- Drink names: 80 char max, whitespace collapsed

## CI/CD & Quality

- Vitest: 21 unit tests (slug generation + API logic + sanitization)
- ESLint 9 (eslint-config-next not compatible with 10 yet)
- Prettier: semi, double quotes, 100 width
- Husky + lint-staged: pre-commit runs eslint --fix + prettier
- GitHub Actions: lint → format:check → test → build on push/PR to main
- Dependabot: weekly, grouped (minor-patch / typescript / nextjs), majors ignored
- TypeScript 6, strict mode

## Database

- Neon Postgres via @neondatabase/serverless (migrated from deprecated @vercel/postgres)
- drizzle-kit push runs at build time (auto-creates/migrates tables)
- drizzle.config.ts uses POSTGRES_URL

## Deployment

- Vercel auto-deploys from main branch
- Env vars: POSTGRES_URL, GOOGLE_GENERATIVE_AI_API_KEY, AI_PROVIDER, ADMIN_SECRET, CRON_SECRET
- Vercel Analytics + Speed Insights enabled

## Known Issues

- Menu photo parsing may fail if Gemini API key has quota/region issues → try GROQ as alternative
- ESLint 10 blocked by eslint-config-next compatibility

## V2 Ideas (deferred)

- Group view (aggregate all sessions for a table)
- Geolocation for bar discovery
- Price tracking
- Offline tap queuing (service worker)
- Rate limiting via Edge Middleware
