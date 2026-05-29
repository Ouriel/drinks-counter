# MEMORY

## Full Review (2026-05-29)

- Lighthouse: accessibility 90/100, best practices 100, SEO 100, LCP 289ms, CLS 0.00
- Critical: missing lang attr on html (FIXED), dangerouslySetInnerHTML in QrCode.tsx (low risk, kept)
- Medium: 5 routes missing try/catch on req.json() (FIXED), TOCTOU race in drinks POST (FIXED), 12 untranslated keys (FIXED), DrinkCard minus button 28px (FIXED to 44px), no main landmark (FIXED), primary button contrast (FIXED), barrel imports (non-issue, HeroUI v3 is single package), admin uses raw fetch (not a bug, skipped)
- Low: abbreviated params in gamification.ts (FIXED), hardcoded strings in admin/stats/loading (cosmetic, skipped)
- Passes: zero any types, parameterized queries, auth on protected routes, typed API client with Zod

## Fixes Applied (2026-05-29)

- Moved <html lang={locale}> and <body> into app/[locale]/layout.tsx (fixes lang + main landmark)
- Root layout now just returns children (no html/body wrapper)
- Added try/catch on req.json() in: sessions POST, drinks POST/PATCH, tables POST/PATCH, admin PATCH/DELETE
- Fixed TOCTOU race in drinks POST: atomic update-then-insert instead of select-then-insert
- Fixed totalRef decrement on server rejection in useOptimisticDrinks (addDrink + increment)
- Added debounce cleanup useEffect in home page
- Fixed DrinkCard minus button touch target: w-7 h-7 → w-11 h-11 (44px)
- Added dark mode primary button contrast CSS override
- Translated 12 missing keys in fr/es/ca/de/it locale files (table._, drinkCard._, stats.\*)
- Fixed abbreviated params in gamification.ts (e→earliest, d→drink, l→latest, sum→sum)
- All 69 tests pass, tsc --noEmit clean

## UX/UI Production Test (tipsy-tap.vercel.app)

- All core flows work on mobile 375x812: home, bar search, session, drinks +/-, badges, table, QR, summary, stats
- Light/dark mode both render correctly
- Locale switching works (French verified)
- Badge popover works on mobile tap
- Admin login form renders correctly
