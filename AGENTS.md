# AGENTS.md — TipsyTap

The single source of rules for every coding agent (Claude Code imports it from `CLAUDE.md`; Kiro and other tools read it directly). What the app does is in `README.md`.

TipsyTap is a small, anonymous drinks counter with low traffic, run by one owner. **Prefer the smallest fix.** Add no new service, dependency, cache, queue, migration framework or history table without the owner's decision.

## Commands

```bash
npm ci               # Node 24 + npm 11; bump .nvmrc, ci.yml and the Vercel setting together
npm run lint         # ESLint + Prettier check (no type-check)
npm run build        # type-check + build; needs no DB
npm test             # i18n key check + Vitest with the coverage gate
npx vitest run tests/<file>.test.ts   # one file (`npm test -- <file>` fails the coverage gate)
npx prettier --write <files you touched>
```

Before you call work done, `lint`, `build` and `test` must all be green: CI runs exactly these. Unset `POSTGRES_URL` first: with it set, every PGlite test fails in `resetDb()` (a guard against wiping a real DB).

## Where things live

| Path                         | Role                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/[locale]/…`             | Every page (next-intl, 9 locales); `proxy.ts` adds the locale prefix                                                                                                      |
| `app/[locale]/layout.tsx`    | `<html lang>`, theme, intl provider, `<main>`, `Toast.Provider`, `PwaInstallPrompt`, Analytics                                                                            |
| `app/[locale]/s/[slug]/`     | Session, summary and table-summary pages: server `page.tsx` plus a `*Client.tsx`                                                                                          |
| `app/api/…`                  | JSON routes; `app/layout.tsx` only loads `globals.css` and metadata                                                                                                       |
| `lib/types.ts`               | `Drink`, `MenuItem` (canonical)                                                                                                                                           |
| `lib/api.ts`                 | Typed client fetch helpers, responses checked with `zod/mini`                                                                                                             |
| `lib/schemas.ts`             | Server input schemas and `parseBody()` (full `zod`)                                                                                                                       |
| `lib/server-queries.ts`      | Server-only queries: `getSessionView`, `getTableStats` (routes + pages), `getLiveSession` (write routes), `getSessionDrinks` (pages; `GET /api/drinks` has its own query) |
| `lib/useOptimisticDrinks.ts` | Drinks state, optimistic writes with rollback, gamification triggers                                                                                                      |
| `lib/gamification.ts`        | Badges, pace, achievements, nudges, personal best, visuals; personal best uses localStorage and pace/achievements the clock, so call them after hydration                 |
| `lib/menu-items.ts`          | `mergeMenuItems()` (adds only, capped at 200) and `normalizeMenuItems()`                                                                                                  |
| `lib/db.ts`                  | Drizzle schema, which must match prod exactly; lazy Neon client                                                                                                           |
| `tests/helpers/`             | `test-db.ts` (PGlite), `render-hook.ts` (jsdom)                                                                                                                           |

## Code rules

### Types and validation

- Import `Drink` and `MenuItem` from `lib/types.ts`, and reuse exported types such as `SessionView` and `TableStats` (`import type` is safe in client code). Never redefine them in new code; the home page, `TableView` and `TableSummaryClient` still hold local copies.
- Client calls go through `lib/api.ts`. Never `fetch().json()` without validation in components.
- The client uses `zod/mini` only. Full `zod` stays on the server (`lib/schemas.ts`, routes), because it adds about 54 KB gzipped to the first load.
- Validate JSON bodies with `parseBody()` from `lib/schemas.ts`, and put new body schemas there (`tables` and admin `DELETE` still declare theirs inline). Wrap `await req.json()` in try/catch and return 400. Multipart and query-param routes validate by hand.
- Prefer one atomic statement (upsert, guarded update) over check-then-act, which races. Don't copy the existing check-then-act spots: nickname picks in `/api/tables`, the admin rename check.
- Errors are `{ error: string }` with a fitting status code. Exceptions: `bars/search` turns every failure into a 200 `{ results: [] }`, `parse-menu` adds `items: []` on its 500, `health` returns `{ status, timestamp }`.
- Every client response is parsed by a `zod/mini` schema in `lib/api.ts`, and a mismatch throws instead of returning null, which skips the optimistic rollback. Change a route's response and its `lib/api.ts` schema in the same PR.
- Use `strict` TypeScript with no `any`, and `type` rather than `interface`.

### React

- Use `useEffect` only for DOM event subscriptions, timers, initial client fetches and syncing a callback ref (the `onCloseRef` pattern in `DrinkPicker` and `Confetti`). Never use it for derived state or for reacting to state changes: put that logic in the event handler. Known exceptions, not to copy: `TableView` refetches when `drinkTotal` changes; `SessionClient` redirects when `notFound`.
- In new components, order declarations: useState → hooks → variables → useMemo → useCallback → useEffect. Don't reorder existing code you aren't otherwise changing.
- Spell out parameter names: `(event)`, never `(e)`; `(item)`, never `(d)`.
- Anything that differs between server and client (localStorage, `Date.now()`, time zone, `toLocale*`, the resolved theme) renders only after hydration, through `useIsHydrated()` (`lib/use-is-hydrated.ts`) or a `useSyncExternalStore` snapshot, never with setState in an effect. This caused React #418 before.

### Rendering and data

- Session pages are server components that fetch through `lib/server-queries.ts` and pass the data as props to a `*Client.tsx`. Clients initialize state from props and never re-fetch on mount what the server already gave them. Keep API response shapes identical to what the pages pass (`getSessionDrinks` and `GET /api/drinks` are separate queries: change both).
- Load interaction-only components (`DrinkPicker`, `Confetti`, `QrCode`) with `next/dynamic`.
- The home page is static (prerendered). Keep it free of server data and request-time APIs.

### UI

- HeroUI v3: `Button` uses `onPress`; a native `<button>` (inside a `Card`, say) uses `onClick`. Long press comes from `useLongPress` in `react-aria`.
- Show every notification with HeroUI `toast()` or `toast.danger()`, and `toast.update()` to settle a loading toast; never build a custom notification UI. Timeouts (owner decision): badges, nudges, personal best and copy confirmations pass `timeout: 10000`; errors and the re-scan result pass `timeout: 5000`; the failed-tap toast passes `timeout: 2000`. Without one HeroUI uses 4 s, and `toast.promise()` always does, so don't use it. Toasts that start with an emoji pass `indicator: null`, so they don't show HeroUI's icon too.
- Category icons come from `lib/category-icon.tsx`: inside a `Chip` for tags, bare in list rows. Emoji (`CATEGORY_EMOJI`) are used only in the shared text recap.
- The 9 categories are listed by hand in `lib/constants.ts`, `lib/category-icon.tsx`, the `z.enum` and prompt in `app/api/parse-menu/route.ts`, and `messages/*.json`. Change them together; only `CATEGORIES` against `en.json` is tested.
- Accessibility: give icon-only buttons an `aria-label`, make new touch targets at least 44 px (`w-11 h-11`, like the drink card's ± buttons; the header's `size="sm"` icon buttons are smaller), and keep `<html lang={locale}>` and the `<main>` landmark.

### i18n

- Every user-facing string goes through `t()`: `getTranslations()` on the server, `useTranslations()` on the client. Add each new key to all 9 locales yourself: `scripts/check-i18n.mjs` (part of `npm test`) fails when a locale differs from `en.json` or an `en.json` key looks unused (a loose substring check that skips the pace, achievements, animals, categories, badges and nudges namespaces), but nothing checks that a key used in `t()` exists.
- Exceptions: the admin UI (English only), `app/not-found.tsx`, the OpenStreetMap credit, and the summary share text, which stays English so any recipient can read it.

### Tests

- Every bug fix starts with a failing test. A test that asserts buggy behaviour is rewritten, not kept. Never write placeholder assertions.
- Route and query tests mock `@/lib/db` with in-memory PGlite (`createTestDb` + `resetDb`), so the real SQL runs. Hook and component tests start with `// @vitest-environment jsdom`; hooks use `tests/helpers/render-hook.ts`.
- Make no live network calls; use fixtures such as `tests/fixtures/nominatim.json`. Assert i18n keys rather than wording. Tests must pass in any time zone.
- The coverage thresholds in `vitest.config.ts` are a floor: raise them when you add tests, never lower them to pass CI.

## Guardrails

### Production data

- **Agents treat prod as read-only.** Read-only SQL and GETs are fine, except `GET /api/cron/cleanup`, which is the delete job. Never run `npm run dev` or `next start` with the prod `POSTGRES_URL`. A check on prod uses no bar, or an existing bar and only drinks already on its menu: a new bar name creates a permanent, shared `bar_menus` row, and in a session with a bar a new drink name or a re-scan is added to that bar's menu for good.
- **Migration first.** A data-model change ships in the same PR as the migration that carries the existing prod data into the new shape. The PR states it in a **Prod data** line, or writes "none needed" and why. Legacy fields are dropped only once the migration is verified.
- **The owner runs every prod DDL or data write:**
  1. Create a Neon backup branch `backup/pre-<phase>-<date>`.
  2. Run read-only preview `SELECT`s with row counts.
  3. Show the exact SQL and get an explicit OK.
  4. Rerun the counts to verify.

  The Neon free plan allows 10 branches, `main` included: never delete a backup branch without the owner's OK.

- **Never run `drizzle-kit push`**, whether in the build or by hand against prod, and never add a `buildCommand` back to `vercel.json`. Push applies DDL with no preview or transaction, exits 0 on failures, and drops whatever `lib/db.ts` does not declare. Mirror every DDL in `lib/db.ts` in the same PR.
- Declare new uniqueness with `uniqueIndex(...)`, not `.unique()`: adding a unique constraint to a table with rows makes drizzle-kit prompt. Keep the existing `.unique()` on `sessions.slug` and `tables.code`, which mirror prod constraints.
- Every write route resolves its session with `getLiveSession(slug)`, so an expired session can't be written. Pages and GET routes treat it as not found until the cron deletes it.
- User paths only grow shared menus (`bar_menus.items`), with one atomic `jsonb` append guarded by `jsonb_array_length(items) < 200`. Additions come from `mergeMenuItems()` (sessions, parse-menu) or a `NOT EXISTS` name check (drinks). Never rewrite the array from an earlier read: that loses concurrent appends. Only the admin PATCH (Save, Empty) replaces the whole array, by owner decision.

### Delivery

- The `main` ruleset requires a green `ci` check on every commit that lands; a direct push of an unchecked commit is rejected. Work on a `<type>/<area>` branch with a Conventional Commits title, then merge with `gh pr merge <N> --squash --auto`. Never rename the `ci` job. Commit, push or open PRs only when the owner asks.
- To roll back a prod regression, use Vercel Instant Rollback first, then revert the squash commit.
- Preview deployments use the Neon branch `preview` (a Preview-only, secret `POSTGRES_URL` that only the owner sets) and sit behind Vercel SSO (`vercel curl`). Try data flows there, not on prod. Apply a prod DDL to `preview` too, or reset `preview` from its parent in Neon (which also wipes its test data). Demo data comes from `scripts/preview-seed.sql`: idempotent, it refuses to run on prod; re-run it to re-date the demo sessions (they expire after 48 h). Every successful preview also runs the Playwright smoke test (`e2e/`, `npm run test:e2e`, workflow `preview-smoke.yml`, informational): keep it green when you change the start → count → summary flow.
- `.github/workflows/ci.yml` and `dependabot-automerge.yml` are kept byte-identical with the owner's other app, PupPace: change both repos or neither. Put repo-specific checks in npm scripts. Sync with PupPace covers engineering only (CI/CD, workflows, tests, architecture), never features.
- Plans and review notes live in `.agents/plans/`, which is untracked and ignored by ESLint, Prettier and Vitest. Never commit them. Stage paths one by one; never `git add -A`.

### Dependencies

- Dependabot updates auto-merge once `ci` is green, except packages that match the repo variable `AUTOMERGE_MANUAL`. One match keeps a whole grouped PR manual; with the variable unset, majors stay manual. Never use "bypass rules" on a Dependabot PR, and never close a red one by hand (Dependabot may skip that version).
- Never resolve a `package-lock.json` conflict by hand: rerun the npm command on a fresh branch from `main`. Never run `npm audit fix --force`. Add no npm `overrides`: HeroUI and its React Aria peers move together in one PR (the `heroui` group).
- `@types/node` follows the Vercel Node major (24). TypeScript majors wait until typescript-eslint supports them. Mention any new dependency before adding it.

### External services

- **OpenStreetMap Nominatim.** Its usage policy forbids search-as-you-type. Type-ahead searches only TipsyTap's own menus (`/api/menus`); Nominatim is called only on Enter/Search. Keep:
  - the 1 request/s limiter (in memory, per function instance);
  - the identifying `User-Agent` and the visible "© OpenStreetMap contributors" link;
  - the 1 h server cache and the 5 s timeout;
  - coordinates rounded to 2 decimals, with a bounded ±0.05° box and `layer=poi`.

  No other geo provider (Overpass included) without an owner decision.

- **Gemini.** `/api/parse-menu` stays public by decision. Billing stays disabled on the Google project, so abuse can only exhaust the free quota for a day, never cost money. Keep the in-memory 5-per-minute-per-IP limiter.

### Security and privacy

- The session slug is the only write key. Never put a session URL or slug in a share, invite or share image (Share sends `/join/<CODE>` or the app origin; the image cards in `lib/share-card.ts` carry neither the slug nor the table's join code), and add no log line with a slug (a slug collision logs the attempt number only).
- Generated slugs are `<adjective>-<noun>-<4 chars>` via `crypto.randomInt`; a noun can contain a dash (`mai-tai`). By owner decision, custom names get no suffix: they stay as typed, lowercased. A taken name falls back to a generated slug.
- Protected routes (admin, cron) check the secret with `verifySecret()` from `lib/auth.ts` (constant time) before any other logic.
- Keep the headers in `next.config.ts`: `frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'` and `nosniff`. Add no `script-src` without nonces, because Next inlines scripts.

### Intended behaviour (owner decisions, don't "fix")

- Sessions expire after 48 h, and the daily cron (06:00–06:59 UTC on Hobby) deletes expired sessions and empty tables. No soft deletes. Never click "Run" on the cron in Vercel: it executes the delete job.
- Admin deletes and "Empty" are hard deletes behind a `confirm()`. Add no archive or history tables.
- Pinch-zoom stays disabled (`maximumScale: 1`, `userScalable: false` in `app/layout.tsx`): the UI is sized for phones. Don't re-enable it.
- Toasts sit at the bottom, at most 5, 10 s each (errors and scan results 5 s, a failed tap 2 s), and are never lifted above the Add button. With 0 drinks the "Add a drink" button is centered; the fixed bottom button appears from the first drink.

### HeroUI overrides to keep

- HeroUI CSS is imported per component in `app/globals.css`. When you render a new HeroUI component, add its `@heroui/styles/components/<name>.css` import: `tests/heroui-css.test.ts` fails if one is missing. It does not catch new sub-part dependencies, so check the UI after a HeroUI update.
- The `.toast-region` / `.toast` rules in `app/globals.css` turn HeroUI's collapsed stack into a full list of visible toasts. Keep them, and check toasts on a phone after any HeroUI upgrade (a 3.2.6 bump already needed a hotfix).

## Working style

- When asked to research, present options and wait for the owner's choice. Don't write or commit code.
