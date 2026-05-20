export type MenuItem = { name: string; category: string };

/** Normalize legacy string[] items to MenuItem[] */
export function normalizeMenuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === "string" ? { name: item, category: "other" } : item));
}
