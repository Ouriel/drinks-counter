## Project

- Drinks Counter: mobile-first app to count drinks during a night out
- Stack: Next.js 16 + TypeScript + Tailwind CSS + Vercel Postgres + Drizzle ORM + Gemini Flash
- Deploy target: Vercel free tier

## Data Model

- `bar_menus`: permanent, shared across users (bar_name + items jsonb)
- `sessions`: personal, 48h TTL, identified by fun slug in URL (`/s/fizzy-mojito-42`)
- `drinks`: per-session counts, cascade delete with session

## Features (V1)

- Bar name search → reuse existing menu or snap new photo
- AI menu parsing (Gemini Flash, free tier)
- Tap-to-count main screen (only shows YOUR drinks)
- Picker with categories + custom item entry
- Undo toast on each action
- Long press = decrement
- Daily cron cleanup of expired sessions

## AI Provider

- Configurable via `AI_PROVIDER` env var: "gemini" (default) or "groq"
- Gemini: `GOOGLE_GENERATIVE_AI_API_KEY` (free: 15 RPM, 1M tokens/day)
- Groq: `GROQ_API_KEY` (free: 30 RPM, 14.4K req/day, llama-3.2-90b-vision)
- Graceful fallback: returns empty items array on parse failure

## Security

- Cron endpoint protected with `CRON_SECRET` Bearer token
- PATCH endpoint verifies drink belongs to session (ownership check)
- Photo upload limited to 4MB client-side (Vercel serverless limit)
- Drink names sanitized to 80 chars, whitespace collapsed
- Bar names sanitized (see Input Sanitization section)

## PWA

- `manifest.json` with `display: standalone` for native-like mobile experience
- Apple Web App meta tags for iOS
- Theme color matches dark background (#030712)
- TODO: generate icon-192.png and icon-512.png

## Accessibility

- `aria-label` on all interactive elements (drink cards, buttons, inputs)
- `role="dialog"` + `aria-modal` on picker
- `role="status"` + `aria-live="polite"` on toast
- Haptic feedback (`navigator.vibrate(10)`) on tap/long-press

## Input Sanitization

- Bar names: trim, lowercase, remove emojis/special chars, keep accents/hyphens/apostrophes, 100 char max
- Fuzzy search: multi-token ILIKE with AND logic ("le compt" matches "le comptoir général")
- Results sorted by name length (closer matches first)

## CI/CD & Quality

- Vitest: 10 unit tests (slug generation + API business logic)
- ESLint: Next.js config, 0 errors
- Prettier: semi, double quotes, 100 width
- Husky + lint-staged: pre-commit runs eslint --fix + prettier on staged files
- GitHub Actions: lint → format:check → test → build on push/PR to main
- Vercel: auto-deploys on push to main (connect repo in dashboard)

## Deployment

- Needs: Vercel Postgres integration + GOOGLE_GENERATIVE_AI_API_KEY env var
- DB push: `npx drizzle-kit push`
- Build passes cleanly (Next.js 16.2.6)

## V2 Ideas (deferred)

- Group view (aggregate all sessions for a table)
- Geolocation for bar discovery
- Price tracking
- More than 2-person split
