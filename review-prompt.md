# TipsyTap UI/UX Review Report

**Date**: 2026-05-29
**Device**: 375×812 @1x (iPhone-like), mobile, touch
**URL**: https://tipsy-tap.vercel.app

---

## Issues Found

### Issue 1: French pluralization bug on Stats page

- **Page**: Stats (`/fr/stats`)
- **Theme**: Both
- **Description**: "1 boissons" displayed for bars with 1 item. Should be "1 boisson" (singular). The English version correctly shows "1 item" (singular).
- **Severity**: Medium
- **Suggested fix**: In the stats page component, use the `t()` function with a count parameter for pluralization:
  ```tsx
  // Instead of:
  `${count} ${t("stats.items")}`;
  // Use:
  t("stats.itemCount", { count });
  ```
  And in `messages/fr.json`:
  ```json
  "itemCount": "{count, plural, one {# boisson} other {# boissons}}"
  ```

---

### Issue 2: Summary page achievements/pace not translated in non-English locales

- **Page**: Summary (`/fr/s/{slug}/summary`)
- **Theme**: Both
- **Description**: When viewing the summary in French, the following remain in English:
  - Pace: "⚡ Warp speed" (should be "Vitesse lumière" — the session page translates it correctly)
  - Achievements: "Signature: mojito", "Devoted to mojito", "Speed Round — 3+ drinks in 30 min"
- **Severity**: Medium
- **Suggested fix**: The pace label on the summary page should use the same `t()` key as the session page. Achievements need translation keys added to all locale files:
  ```json
  "achievements": {
    "signature": "Signature : {drink}",
    "devoted": "Dévoué au {drink}",
    "speedRound": "Speed Round — 3+ verres en 30 min"
  }
  ```

---

### Issue 3: Top Bars layout wraps at 375px for long bar names

- **Page**: Stats (`/en/stats` and `/fr/stats`)
- **Theme**: Both
- **Description**: Bar #5 "le bar du bouillon" causes the category text ("cocktail") to wrap to a new line, breaking the single-line alignment that other entries maintain. The bar name + emoji + category + item count exceeds the available width.
- **Severity**: Low
- **Suggested fix**: Add `truncate` to the bar name element or use a flex layout with `min-w-0` and `truncate`:
  ```tsx
  <span className="truncate min-w-0">{bar.name}</span>
  ```

---

## All Clear (No Issues)

### Home page (`/en`)

- ✅ Logo, title, tagline, "Start counting" button, session input, recent sessions, Stats button — all present
- ✅ Bar search: DB suggestions AND OSM "📍 Nearby places" both load correctly
- ✅ Camera/Gallery buttons disabled until 2+ chars, enabled after
- ✅ Locale switcher works (6 locales with flag emojis)
- ✅ Theme toggle works
- ✅ PWA install banner appears on home page only

### Session page (`/en/s/{slug}`)

- ✅ Header layout: `🏠 📤 | logo+TipsyTap | 🇬🇧EN 🌙` — no overlap at 375px
- ✅ "X drinks" heading below header, centered
- ✅ Bar name + slug + timer + pace all render correctly
- ✅ Empty state: "No drinks yet" + hint text
- ✅ Add drink flow: modal opens → type name → "Add" button → drink appears
- ✅ Drink picker modal: fully opaque background in both themes
- ✅ DrinkCard: +/- buttons work, count increments/decrements
- ✅ Minus button touch target: 50×50px (≥44px requirement met)
- ✅ Plus button touch target: 91×50px
- ✅ "Long press to remove" hint: visible at ≤3 drinks, hidden at >3
- ✅ Tipsy effects at 5+: slight rotation
- ✅ Tipsy effects at 10+: text shadow (subtle)
- ✅ Tipsy effects at 15+: vignette overlay (dark edge pulse)
- ✅ Color shift: background shifts from cool blue to warm amber as drinks increase
- ✅ Dark mode tipsy hue: visibly tinted but dark (10-15% lightness)
- ✅ Pace indicator: appears after 5+ minutes (⚡ Warp speed confirmed at 14m/16 drinks)
- ✅ Timer: shows elapsed time (e.g., "⏱ 14m")

### Table feature

- ✅ Create table: 6-char code generated (H34CWN)
- ✅ Animal nickname assigned (🐞 Ladybug)
- ✅ 👉 marks current user, 👑 marks leader
- ✅ QR code renders as SVG
- ✅ Join from second tab: creates new session, joins table, both members visible
- ✅ Leaderboard shows correct nicknames and totals
- ✅ Invalid code: single "😕 Could not join table" message + "Start fresh" button (no duplicate)

### Summary page (`/en/s/{slug}/summary`)

- ✅ 0 drinks: renders cleanly with just "0 drinks total", no badges/achievements
- ✅ 16 drinks: shows badges (6 emoji buttons), achievements, drink list, personal best
- ✅ Badge popover: tap emoji → shows title + subtitle ("First Sip" / "The night begins!")
- ✅ "Copy text 📋" → changes to "Copied ✓" for 2 seconds
- ✅ Share, Back buttons work
- ✅ Category chips with emoji + name + count

### Stats page (`/en/stats`)

- ✅ All stat cards render (Bars, Sessions, Drinks, Active now, Today, This week)
- ✅ "~4 drinks per session on average" text
- ✅ By Category with emoji + count
- ✅ Top Drinks ranked list
- ✅ Top Bars with "1 item" (singular) ✓
- ✅ Back link (←) works
- ✅ No PWA banner

### Admin page (`/en/admin`)

- ✅ Login form: input and button same width on mobile
- ✅ No PWA banner

### Join page (`/en/join/{CODE}`)

- ✅ Invalid code: single error message + "Start fresh" button
- ✅ Valid code: auto-creates session, joins table, redirects to session page
- ✅ PWA banner appears on join page

### Locale switching

- ✅ All visible text changes when switching locale (tested EN→FR)
- ✅ 🏠 button aria-label is "Accueil" in French (not "Nouveau") ✓
- ✅ Session page: all buttons, hints, pace translated
- ✅ Summary page: heading, total, personal best, buttons translated
- ✅ Stats page: headings, stat labels, average text translated

### Dark/Light theme

- ✅ Home page: both themes clean
- ✅ Bar search step: both themes clean
- ✅ Session page 0 drinks: both themes clean
- ✅ Session page 15+ drinks: dark mode shows warm olive/amber tint, light mode shows warm amber shift
- ✅ Drink picker modal: fully opaque in both themes
- ✅ Table section: both themes clean, "Leave table" clearly red
- ✅ Summary page: dark mode card readable
- ✅ Stats page: both themes clean
- ✅ Admin login: both themes clean, input distinguishable from background
- ✅ Join error page: both themes clean

---

## Summary

**3 issues found** (0 critical, 2 medium, 1 low):

| #   | Severity | Page             | Issue                                             |
| --- | -------- | ---------------- | ------------------------------------------------- |
| 1   | Medium   | Stats (FR)       | "1 boissons" — missing singular form              |
| 2   | Medium   | Summary (non-EN) | Achievements and pace not translated              |
| 3   | Low      | Stats            | Long bar name wraps category to new line at 375px |

The app is in excellent shape overall. All core features work correctly, both themes are well-implemented, the tipsy effects are fun and functional, and the i18n coverage is comprehensive with only minor gaps in the summary achievements and stats pluralization.
