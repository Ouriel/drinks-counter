import type { Drink } from "@/lib/types";

// "Your nights": a small history kept on this phone only, so it outlives the 48 h
// server-side session and stays anonymous.
export const NIGHTS_KEY = "tipsytap_nights";
const MAX_NIGHTS = 20;

export type Night = {
  slug: string;
  barName: string;
  date: string;
  total: number;
  topDrink: string | null;
};

export function summarizeNight(drinks: Pick<Drink, "name" | "count">[]) {
  const total = drinks.reduce((sum, drink) => sum + drink.count, 0);
  const top = drinks.reduce<Pick<Drink, "name" | "count"> | null>(
    (best, drink) => (!best || drink.count > best.count ? drink : best),
    null
  );
  return { total, topDrink: top?.name ?? null };
}

/** The drink list as a +1/−1 tap on `name` is about to leave it. */
export function withTap(drinks: Drink[], name: string, delta: 1 | -1, category?: string): Drink[] {
  const key = name.toLowerCase();
  if (!drinks.some((drink) => drink.name.toLowerCase() === key)) {
    return delta > 0
      ? [...drinks, { id: "new", name, count: 1, category: category ?? null }]
      : drinks;
  }
  return drinks
    .map((drink) =>
      drink.name.toLowerCase() === key ? { ...drink, count: drink.count + delta } : drink
    )
    .filter((drink) => drink.count > 0);
}

/** Stored nights with this one updated: newest start first, one per slug, first start kept. */
export function recordNight(stored: string | null, night: Night): Night[] {
  const list = parseNights(stored);
  const known = list.find((item) => item.slug === night.slug);
  return [
    { ...night, date: known?.date ?? night.date },
    ...list.filter((item) => item.slug !== night.slug),
  ]
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, MAX_NIGHTS);
}

/** Saves the night after `drinks` (a night with no drink is not kept). */
export function saveNight(slug: string, barName: string, drinks: Drink[]) {
  const { total, topDrink } = summarizeNight(drinks);
  if (total === 0) return;
  const started =
    drinks
      .map((drink) => drink.createdAt)
      .filter(Boolean)
      .sort()[0] ?? new Date().toISOString();
  try {
    const night = { slug, barName: barName || slug, date: started, total, topDrink };
    localStorage.setItem(
      NIGHTS_KEY,
      JSON.stringify(recordNight(localStorage.getItem(NIGHTS_KEY), night))
    );
  } catch {}
}

function parseNights(stored: string | null): Night[] {
  try {
    const parsed: unknown = JSON.parse(stored || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Client-only: call after hydration. */
export function loadNights(): Night[] {
  try {
    return parseNights(localStorage.getItem(NIGHTS_KEY));
  } catch {
    return []; // storage blocked
  }
}
