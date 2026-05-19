## Project

- TipsyTap: mobile-first drinks counter app
- Stack: Next.js 16 + TypeScript 6 + HeroUI v3 + Tailwind CSS 4 + Neon Postgres + Drizzle ORM
- Deploy: Vercel free tier, auto-deploy on push to main
- Repo: github.com/Ouriel/drinks-counter (private)
- URL: https://drinks-counter-rho.vercel.app
- Domain: tipsy-tap.vercel.app

## Current State (2026-05-19)

- App is live and functional
- AI menu parsing works (Gemini 2.5 Flash Lite, 15 RPM free)
- Multiple photo upload from gallery works
- Camera button opens camera directly (Android 14+ workaround)
- HeroUI v3 components (Button, Input, Card)
- Dark/light theme toggle (next-themes)
- Original Gemini logo (pint glass + question mark, dark bg)

## Known Issues

- Android 14+ Chrome: camera option only via separate capture button (known Chrome bug)
- SVG logo question mark could be improved (text rendering varies by device)
- Stats page is public (no auth) — acceptable for now

## Data Model

- `bar_menus`: permanent, shared (bar_name lowercase + items jsonb)
- `sessions`: personal, 48h TTL, slug URL
- `drinks`: per-session, name lowercase, case-insensitive matching

## AI

- Model: gemini-2.5-flash-lite (current free tier)
- Prompt: generic types when one of a kind, brand names when multiple variants, includes supplements (picon etc), splits combos, lowercase
- Image compression: browser-image-compression (web worker, max 1MB, 1600px)

## Key Files

- `lib/sanitize.ts` — shared sanitization (bar names + drink names, both lowercase)
- `lib/ai.ts` — configurable provider (gemini/groq)
- `lib/slugs.ts` — 3-word slugs (adjective-noun-extra, 24K combos)
- `lib/theme-switch.tsx` — dark/light toggle

## CI/CD

- Vitest: 20 tests
- ESLint 9 + Prettier
- Husky + lint-staged pre-commit
- GitHub Actions CI
- Dependabot weekly (grouped, majors ignored)
- drizzle-kit push runs at build time

## Env Vars (Vercel)

- POSTGRES_URL, GOOGLE_GENERATIVE_AI_API_KEY, AI_PROVIDER, ADMIN_SECRET, CRON_SECRET

## Next Session TODO

- Test menu photo parsing end-to-end with real bar menu
- Consider adding "Review" button on bar step after photo (currently goes straight to review)
- PWA install prompt
- OG image for social sharing
