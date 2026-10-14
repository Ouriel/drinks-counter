# TipsyTap 🍻

A mobile-first web app that counts your drinks during a night out. Pick your bar, snap its menu, then tap a card each time you order. No account, no install: the session link is all you need.

Live at **https://tipsy-tap.vercel.app** (9 languages, dark and light themes, installable as a PWA).

## What it does

### Start an evening

- **Pick the bar.** As you type (2+ letters), TipsyTap suggests bars it already knows. A known bar comes with its saved menu, so you can start right away.
- **Find a new bar nearby.** Press Enter or the keyboard's Search key to look the name up on OpenStreetMap. Your location is asked only at that moment, and is sent rounded to about 1 km. With it, you get up to 5 bars, pubs, cafés, restaurants, nightclubs and beer gardens within about 5 km, nearest first; without it, the search is worldwide.
- **Snap the menu.** Take a photo of the menu. Gemini reads it and lists the drinks, keeping the menu's own language. It splits sizes when they are legible (e.g. `25cl herrenbrau`) and gives each drink one of 9 categories: beer, wine, cocktail, spirit, shot, mocktail, soft, food or other. You then review the list: edit names, remove junk, start counting.
- **Or skip the menu** and add drinks by hand later.

Every menu you scan, and every new drink you add, joins the bar's **shared menu**, so the next group at that bar starts with it (up to 200 items per bar).

### Count

- Each drink is a card: tap **+** to add one; tap **−** or long-press **+** to remove one. A drink disappears when it reaches 0. The screen updates instantly, with a short vibration, and rolls back if the server refuses the change.
- The **drink picker** lists what you already ordered first (tap for +1), then the bar's menu grouped by category, with a search box. Type a name that isn't on the menu to add a custom drink with its category. Changed menu? **Re-scan** it from the picker.
- 👑 marks your most-ordered drink (once you have 2 different drinks; ties share it). The header shows the time since your first drink and your **pace** (drinks per hour, from "🐢 Nursing It" to "☄️ Send Help", once 5 minutes have passed).

### The fun layer

- **11 milestone badges** (1, 2, 3, 5, 7, 10, 13, 15, 20, 25 and 30 drinks), each with a toast and confetti.
- A **personal best** per device: beat your record from an earlier night and you get a 🏅 toast (unless that same tap earns a badge, which takes its place).
- **Nudges**: a water break every 3rd drink (skipped when that drink was alcohol-free), a taxi reminder at 8 drinks, and a gentle "stop soon" at 12 when that drink was alcohol-free (otherwise the water break wins).
- The screen **gets tipsy with you**: the background warms from cool blue to amber, the page starts to tilt after 3 drinks, the text gets a shadow from 7, and a pulsing vignette appears from 15.

### Summary and sharing

- **My Summary** shows the total, date and duration, pace, categories, the badges earned, **achievements** from a set of 17 ("Past midnight and proud", "Speedrun, any% — 3 in 30 min", "Lined the stomach"…), a timeline of every tap and your top drinks.
- **Share** sends a playful text recap (in English) through the device's share sheet, or copies it when the browser can't share.
- On the session page, Share sends the table invite (or the app link). It **never** sends your session link, because that link is what lets you edit your count.

### Tables (groups)

- Create a **table** to count with friends: you get a 6-character code and a random animal nickname (🦊 Fox, 🐧 Penguin…). You can re-roll the nickname up to 3 times.
- Friends join with the code, a `/join/CODE` link or a QR code. A join link reuses your latest session on that phone if it started less than 12 h ago, otherwise it starts a new one. Joining gives you the bar and menu of the table (after a reload when you type the code on your session page). Anyone can leave a table.
- A live **leaderboard** refreshes every 30 s. Tap a member to see their drinks. The **Table Summary** page shows the group total, ranking, categories and top drinks.

### Coming back, stats and admin

- **Recent sessions**: the home screen lists the last 10 sessions started on this device (from home or a join link) in the last 48 h.
- **Your session link** (`/s/<name>`) is your key. Generated names look like `velvet-negroni-x7k2` and are hard to guess. The home screen's session box opens `/s/<name>`: it resumes a live session with that name, or starts a new evening under it (lowercase letters, digits and dashes, up to 50). A custom name is only as private as it is hard to guess. An expired link brings you back home to start again under that name (or a generated one while the old session is still stored).
- **Stats** (public): bars known (all time), then, over the sessions still stored (the last 2 to 3 days): sessions, drinks, active sessions, taps in the last 24 h, the split by category and top drinks; plus the bars with the biggest menus.
- **Admin** (protected by a secret): edit, rename, re-scan, empty or delete bar menus; inspect and delete sessions and tables; a Guide tab explaining badges, pace, achievements and visual effects.

### Privacy and data lifetime

- No accounts and no personal data. Anyone who has a session link, or types its name, can edit that session, so keep it to yourself.
- A session expires **48 h** after it starts. A daily cleanup (between 06:00 and 06:59 UTC on Vercel Hobby) then deletes it with its drinks, as well as tables nobody belongs to any more. So a session stays stored for 2 to 3 days in total.
- Bar menus are shared and kept.
- Recent sessions, your personal best and how many nickname re-rolls you used are stored in your browser only.
- The app uses Vercel Analytics and Speed Insights.
- There is no offline mode: a tap made without a network is rolled back.

## How it works

```
Phone ──> Vercel (Next.js 16, App Router)
           ├─ app/[locale]/…   pages, 9 locales via next-intl (proxy.ts adds the locale prefix)
           │    home           static, client component (bar search, scan, review)
           │    s/[slug]/…     server-rendered from the DB, then client-side optimistic updates
           ├─ app/api/…        JSON routes (no accounts: the session slug is the write key; admin and cron need a secret)
           └─ daily cron      /api/cron/cleanup (06:00–06:59 UTC on Hobby)
        ──> Neon Postgres (Drizzle ORM, HTTP driver)
        ──> Google Gemini 2.5 Flash Lite (menu photos, via the Vercel AI SDK)
        ──> OpenStreetMap Nominatim (bar lookup on Enter)
```

| Route                                   | What it does                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST/GET /api/sessions`                | Create a session (bar, menu, optional custom name) / read a session and its menu                      |
| `GET/POST/PATCH /api/drinks`            | List drinks / add a tap (atomic upsert) / +1 or −1                                                    |
| `GET/POST/PATCH/PUT/DELETE /api/tables` | Ranking, member drinks and stats / create / join / re-roll nickname / leave                           |
| `GET /api/menus`                        | Search saved bars (every word must match)                                                             |
| `GET /api/bars/search`                  | Nominatim lookup (1 request/s per instance, a faster one returns no results; 5 s timeout; cached 1 h) |
| `POST /api/parse-menu`                  | Photo (≤ 4 MB, 5 per minute per IP) → Gemini → drinks with categories                                 |
| `GET/PATCH/DELETE /api/admin`           | Admin data (`Authorization: Bearer ADMIN_SECRET`)                                                     |
| `GET /api/cron/cleanup`                 | Delete expired sessions and empty tables (`Bearer CRON_SECRET`)                                       |
| `GET /api/health`                       | Database ping                                                                                         |

**Data model** (`lib/db.ts`):

- `bar_menus`: one row per bar name (kept unique by the app, there is no DB unique index), with a shared, permanent menu (`items`: `{ name, category }[]`).
- `sessions`: one person's evening, with a unique slug, a 48 h `expires_at`, and an optional bar and table with a nickname.
- `drinks`: one row per drink name per session (unique index `drinks_session_name_idx`), with `count` and one timestamp per tap (`tapped_at`). Drinks are deleted along with their session.
- `tables`: a group with a unique 6-character code.

## Stack

| Layer      | Technology                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router), React 19, TypeScript 6 (strict)                                                   |
| UI         | HeroUI v3 + Tailwind CSS 4, lucide icons, next-themes                                                      |
| i18n       | next-intl: en, fr, de, es, ca, it, sv, nl, pt                                                              |
| Validation | Zod on the server, `zod/mini` on the client                                                                |
| Database   | Neon Postgres + Drizzle ORM                                                                                |
| AI         | Vercel AI SDK + Google Gemini 2.5 Flash Lite                                                               |
| Hosting    | Vercel Hobby (prod from `main`), Vercel Analytics + Speed Insights                                         |
| Runtime    | Node 24 with its npm 11, set in 3 places kept in sync by hand: `.nvmrc`, `ci.yml`, Vercel project settings |
| Tests      | Vitest + PGlite (in-memory Postgres) + jsdom                                                               |
| Lint       | ESLint 10 + Prettier, Husky + lint-staged pre-commit                                                       |

## Development

```bash
npm ci               # Node 24 (see .nvmrc)
cp .env.example .env.local   # fill only what you need; never the prod POSTGRES_URL
npm run dev          # http://localhost:3000
```

Lint, build and tests need no database or secrets. There is no shared dev database: for DB pages, use your own Postgres or a Neon branch. Pointed at prod, every local tap and new bar name is a real, permanent write. Without `POSTGRES_URL`, the home page and the OpenStreetMap lookup work, but known-bar suggestions, starting a session, session pages and stats fail. Menu scans need `GOOGLE_GENERATIVE_AI_API_KEY`.

```bash
npm run lint         # ESLint + Prettier check
npm run build        # Type-check + production build (never touches the DB schema)
npm test             # i18n key check + Vitest with the coverage gate
npx vitest run tests/api-drinks.test.ts   # one file, without the coverage gate
```

Tests run the real SQL on an in-memory PGlite database and make no network calls. With `POSTGRES_URL` set, the DB tests fail on purpose (a guard against wiping a real database), so unset it.

## Delivery

- **Branches and PRs.** A ruleset on `main` requires a green `ci` check on every commit that lands, so changes go through a PR, and a direct push of an unchecked commit is rejected. The owner can bypass it on a PR in an emergency. CI runs `npm ci`, lint, build and test on Node 24.
- **Deploy.** Every merge to `main` deploys to production on Vercel. Preview deployments have no database.
- **Dependencies.** Dependabot opens grouped updates every Monday. A PR merges on its own once `ci` is green, unless one of its packages matches a pattern in the repo variable `AUTOMERGE_MANUAL`: then the whole PR is merged by hand. With the variable unset, majors stay manual.
- **Database changes.** The build never changes the schema. A schema change is applied to prod by hand, together with the migration of the existing data, then mirrored in `lib/db.ts`. See `AGENTS.md` (Guardrails) for the procedure.

Engineering rules for contributors and coding agents live in [`AGENTS.md`](AGENTS.md).

## Environment variables

| Variable                       | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `POSTGRES_URL`                 | Neon Postgres connection string (production only on Vercel) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini, for menu scanning                                   |
| `ADMIN_SECRET`                 | Protects the admin API; the `/admin` page asks for it       |
| `CRON_SECRET`                  | Protects the cleanup cron; Vercel sends it automatically    |

## License

GPL-3.0
