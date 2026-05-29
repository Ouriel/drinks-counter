# MEMORY

## UI/UX Review (2026-05-29)

- Full review completed at 375×812 @1x mobile emulation
- Report saved to `review-prompt.md`
- 3 issues found and fixed:
  1. FR/DE/ES/CA/IT pluralization: added ICU plural format to `bar.items` key in all locale files
  2. Summary achievements/pace i18n: added `key`+`params` to Achievement type, summary now uses `t(`achievements.${key}`)` and translates pace label
  3. Stats bar name wrapping: moved `truncate` to parent div (block element) where it actually works
- Toast fixes: increased timeout to 5000ms, added `scaleFactor={0}` to Toast.Provider to show toasts expanded (not stacked/collapsed)
- Slug display: moved to same line as bar name with dotted underline + Popover explaining it's a shareable session link. Added `slugExplain` i18n key to all 6 locales.
- All 69 tests pass, tsc clean
