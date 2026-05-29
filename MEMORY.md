# TipsyTap — MEMORY

## Deployment Fix (i18n)

- PwaInstallPrompt used `useTranslations` outside `NextIntlClientProvider` (was in root layout, moved to `[locale]` layout)
- Admin page wrapped in server component with `export const dynamic = "force-dynamic"` (client component in `AdminClient.tsx`)
- Added `app/not-found.tsx` for the `/_not-found` prerender
- Middleware deprecation warning (Next.js 16 wants "proxy" instead of "middleware") — non-blocking

## Dependabot

- PRs #7 and #8 merged (ai-sdk 3.0.79, ai 6.0.191, qrcode-generator 1.5.2, vitest 4.1.7, @types/node 25.9.1, @types/react 19.2.15)

## Bug Fixes

- QR code join: PATCH `/api/tables` now inherits `barMenuId` from existing table members
- Leaderboard: stable sort (by nickname on ties), multiple crowns for tied top score
- Leaderboard: current user highlighted with ring + "(you)" label
- Leaderboard: refresh button + 30s auto-refresh (was 60s)
- Leaderboard: click on member opens modal with their drinks list
- DrinkCard: visible − button + larger + button (removed long-press-only pattern)
- Light mode: replaced `text-muted` → `text-default-500`, `bg-surface` → `bg-default-100` (theme-aware)
- Text size: base font-size set to 18px in globals.css

## New Features

- Summary timeline: chronological drink list with timestamps
- Badge tooltips: HeroUI Tooltip compound component shows title + subtitle on hover/tap
- Member drinks modal: click any leaderboard member to see their drink list

## HeroUI v3 API Notes

- Button variants: `primary`, `secondary`, `tertiary`, `ghost`, `outline`, `danger`, `danger-soft`
- Tooltip: compound `<Tooltip>` > `<Tooltip.Trigger>` + `<Tooltip.Content>`
- Modal: compound `<Modal state={}>` > `<Modal.Backdrop>` > `<Modal.Container>` > `<Modal.Dialog>` > `<Modal.Header>` / `<Modal.Body>`
- Modal needs `useOverlayState()` hook for state management

## Remaining

- Leaderboard alcohol consideration: needs drink volume data (not in current schema). Could add estimated "standard drinks" per category as a future feature.
