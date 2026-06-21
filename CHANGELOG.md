# Changelog

All notable changes to TipsyTap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-21

Major release: full internationalization, a server-rendered session flow, a richer
gamification layer, and a hardened, fully-audited codebase.

### Added

- **9 locales** (en, fr, de, es, ca, it, sv, nl, pt) with translated drink categories,
  badges, achievements, pace labels, nudges, toasts, and control labels.
- **Gamification**: milestone badges, drink achievements, a drinks-per-hour pace indicator,
  personal-best tracking, and a per-tap timeline (`tappedAt`).
- **Tables**: shared table stats summary, animal-nickname reroll, QR/link sharing.
- **Admin**: a Guide tab documenting badges/pace/achievements/visuals, and an "Empty menu"
  action that clears a bar's drinks while keeping the bar.
- Playful, shareable summary copy.
- `scripts/check-i18n.mjs` — locale parity + orphaned-key checker (221 keys × 9 locales).
- Expanded pure-logic test suite (nicknames, constants, gamification branches) and
  `@vitest/coverage-v8` coverage tooling.

### Changed

- UI refresh: lucide category/heading icons replacing decorative emoji, renamed summaries,
  reworked table sharing, and amber drink-tinted iconography.
- Streamlined bar flow (camera hidden once a menu exists, in-picker re-scan) and a
  Gemini-only menu scan with language-preserving extraction.
- Localized all remaining user-facing strings (badge/nudge/personal-best/import toasts and
  the theme/language switch labels) instead of hardcoded English.
- Naming pass: spelled out abbreviated parameters and replaced `interface` with `type` to
  match the project conventions; removed stale/orphaned i18n keys.
- Dependency upgrades: `@heroui/react`/`@heroui/styles` 3.0.5 → 3.2.1, Next.js 16.2.6 →
  16.2.9, `eslint-config-next`, `@types/node`.

### Performance

- Server-render the session, summary, and table-summary pages to remove the
  spinner-then-fetch-after-hydration waterfall.
- Code-split interaction-only components (DrinkPicker, Confetti, QrCode) out of the initial
  session bundle, and reduce round-trips for the session and table-summary views.
- Lazily initialize the Neon client so `next build` needs no database connection.
- Prioritize the home hero logo as the LCP element.

### Fixed

- Resolve a React #418 hydration mismatch on the session page by gating time-relative UI
  (pace, elapsed timer) to the client via `useSyncExternalStore`.
- Keep the menu's own language and capture column-header beer sizes during AI parsing.
- Skip the water nudge after a non-alcoholic/food drink; de-duplicate the pace hint.
- Render toasts as a full vertical list instead of a collapsed stack.
- Equalize the +/- buttons in dark mode; correct summary duration, orphan-session joins,
  and personal-best confetti.

[2.0.0]: https://github.com/Ouriel/drinks-counter/releases/tag/v2.0.0
