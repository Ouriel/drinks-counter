# CLAUDE.md — TipsyTap

## Quick Context

Drinks counter PWA. Next.js 16 + HeroUI v3 + Neon Postgres + Gemini AI. Strict TypeScript, Zod everywhere.

## Before Making Changes

1. `npx tsc --noEmit` — must pass clean
2. `npm test` — 76 tests, all must pass
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

- Every test must exercise real code — no placeholder assertions
- Don't import `lib/db.ts` in tests (triggers DB connection)
- Test pure functions: gamification, sanitize, schemas, slugs, auth, normalizeMenuItems

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
- Don't forget to run prettier after editing
