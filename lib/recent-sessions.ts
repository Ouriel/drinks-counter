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

export type RecentSession = { slug: string; barName: string; date: string };

/** Adds a session to the stored list: newest start first, one entry per slug, at most 10. */
export function addRecentSession(stored: string | null, entry: RecentSession): RecentSession[] {
  let list: RecentSession[] = [];
  try {
    const parsed: unknown = JSON.parse(stored || "[]");
    if (Array.isArray(parsed)) list = parsed;
  } catch {}
  // A session opened again keeps its first known start date (the join link relies on it).
  const known = list.find((item) => item.slug === entry.slug);
  return [known ?? entry, ...list.filter((item) => item.slug !== entry.slug)]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 10);
}
