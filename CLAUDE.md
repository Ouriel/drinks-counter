# CLAUDE.md — TipsyTap

## Quick Context

Drinks counter PWA. Next.js 16 + HeroUI v3 + Neon Postgres + Gemini AI. Strict TypeScript, Zod everywhere. Node 24 / npm 11 (`.nvmrc`), same as CI and Vercel.

## Before Making Changes

1. `npx tsc --noEmit` — must pass clean
2. `npm test` — all tests must pass
3. `npx prettier --write` on every file you touch
4. Check `lib/types.ts` before defining any type locally

## Critical Rules

### Types & Validation

- Canonical types live in `lib/types.ts` (Drink, MenuItem) — import from there, never redefine
- Client-side API calls go through `lib/api.ts` — typed helpers with Zod response validation
- Server-side input validation via `lib/schemas.ts` (Zod)
- Never `fetch().json()` without validation in components

### React

- useEffect ONLY for: DOM event subscriptions, timers, initial data fetch
- NEVER useEffect for: derived state, reacting to state changes, event side effects
- Use `onCloseRef` pattern to stabilize callback deps
- Declaration order: useState → hooks → variables → useMemo → useCallback → useEffect
- No abbreviated params: `(event)` not `(e)`, `(item)` not `(d)`, `(word)` not `(w)`

### Rendering & Data Fetching

- Session pages (`s/[slug]`, `/summary`, `/table-summary`) are server components (`page.tsx`) that fetch initial data via `lib/server-queries.ts` and pass it to a `*Client.tsx` component. No spinner-then-fetch-after-hydration.
- `lib/server-queries.ts` is server-only (imports `lib/db.ts`); it's the single source of query logic shared by the API routes AND the server pages, so API response shapes stay identical (client polling/updates unaffected).
- Client components init `useState` from props — never re-fetch on mount what the server provided.
- Code-split interaction-only components (`DrinkPicker`, `Confetti`, `QrCode`) with `next/dynamic`.

### UI

- All notifications via `toast()` from `@heroui/react` — never custom toast components
- `Toast.Provider` is in layout.tsx (global)
- Confetti fires on badge milestones via `onBadge` callback from `useOptimisticDrinks`
- DrinkCard uses `useLongPress` from `react-aria` (not manual timer logic)
- Button uses `onPress` not `onClick`

### Testing

- Every bug fix starts with a failing test; a test that asserts buggy behaviour is rewritten, not kept
- Every test must exercise real code — no placeholder assertions
- Route and query tests mock `@/lib/db` with in-memory PGlite (`createTestDb` + `resetDb` from `tests/helpers/test-db.ts`), so the real SQL runs
- Hook and component tests start with `// @vitest-environment jsdom`; hooks use `renderHook` from `tests/helpers/render-hook.ts`

### Database Changes

- Migration first: a data-model change ships, in the same PR, with the migration that carries the existing prod data into the new shape. The PR states it in a **Prod data** line (or "none needed" and why). Legacy fields are dropped only once the migration is verified.
- No `drizzle-kit push`: not in the build, and never by hand against prod (no preview, and it drops objects `lib/db.ts` does not declare)
- Every prod DDL or data write is run by the owner: backup branch in Neon (`backup/pre-<phase>-<date>`), read-only preview `SELECT`s with counts, the exact SQL shown and OK'd, then the counts rerun to verify
- Mirror every DDL in `lib/db.ts` in the same PR

### Dependencies

- Dependabot updates auto-merge once `ci` is green, except packages listed in the repo variable `AUTOMERGE_MANUAL`, which are merged by hand

## Key Files

| File                         | Role                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `lib/types.ts`               | Canonical Drink, MenuItem types                                                       |
| `lib/api.ts`                 | Typed fetch client + Zod response schemas                                             |
| `lib/server-queries.ts`      | Server-only data access shared by API routes + server pages                           |
| `lib/useOptimisticDrinks.ts` | Hook: drinks state + optimistic updates + undo + gamification (accepts initialDrinks) |
| `lib/schemas.ts`             | Zod input validation for all API routes                                               |
| `lib/gamification.ts`        | Pure functions: badges, pace, nudges, achievements                                    |
| `app/layout.tsx`             | Toast.Provider + PwaInstallPrompt                                                     |
| `app/s/[slug]/error.tsx`     | Error boundary                                                                        |

## Common Mistakes to Avoid

- Don't add useEffect to react to state changes — put logic in the event handler that causes the change
- Don't build custom notification UI — HeroUI toast handles queuing, stacking, auto-dismiss
- Don't define types locally when they exist in lib/types.ts
- Don't use `(e) =>` or `(d) =>` — spell out parameter names
- Don't write tests that assert `null === null` or `Date.now() > Date.now() - 1000`
- Don't write or commit code when asked to research — present options and wait for explicit user choice first
- Don't forget to run prettier after editing
