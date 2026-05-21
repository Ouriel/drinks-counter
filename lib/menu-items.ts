export type { MenuItem } from "@/lib/types";
import type { MenuItem } from "@/lib/types";

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
