export type { MenuItem } from "@/lib/types";
import type { MenuItem } from "@/lib/types";

/** `current` plus the `incoming` names it doesn't have yet (case-insensitive), up to `max` in total. Never trims `current`. */
export function mergeMenuItems(current: MenuItem[], incoming: MenuItem[], max = 200): MenuItem[] {
  const seen = new Set(current.map((item) => item.name.trim().toLowerCase()));
  const merged = [...current];
  for (const item of incoming) {
    if (merged.length >= max) break;
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

/** Normalize legacy string[] items to MenuItem[], validating JSONB shape */
export function normalizeMenuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.reduce<MenuItem[]>((acc, item) => {
    if (typeof item === "string") {
      acc.push({ name: item, category: "other" });
    } else if (item && typeof item === "object" && typeof item.name === "string") {
      acc.push({
        name: item.name,
        category: typeof item.category === "string" ? item.category : "other",
      });
    }
    return acc;
  }, []);
}
