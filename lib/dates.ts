/** A night's date in the app's language, e.g. "Tue 14 Oct" or "Tue 14 Oct, 22:05".
 * Client-only (after hydration): it depends on the viewer's time zone. */
export function formatNightDate(iso: string, locale: string, withTime = false): string {
  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withTime && { hour: "2-digit", minute: "2-digit" }),
  });
}
