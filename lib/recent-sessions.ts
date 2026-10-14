// Long enough for a night out, short enough to never pick up yesterday's session.
const JOIN_REUSE_WINDOW_MS = 12 * 60 * 60 * 1000;

/** Slug of the latest local session if it started tonight (a join link reuses it), else null. */
export function pickJoinableSlug(stored: string | null, now = Date.now()): string | null {
  try {
    const [latest] = JSON.parse(stored || "[]") as { slug?: string; date?: string }[];
    const age = now - new Date(latest?.date ?? NaN).getTime();
    return latest?.slug && age >= 0 && age < JOIN_REUSE_WINDOW_MS ? latest.slug : null;
  } catch {
    return null;
  }
}
