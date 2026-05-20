import { describe, it, expect } from "vitest";
import { normalizeMenuItems } from "@/lib/menu-items";

describe("normalizeMenuItems", () => {
  it("converts string[] to MenuItem[]", () => {
    const result = normalizeMenuItems(["mojito", "beer"]);
    expect(result).toEqual([
      { name: "mojito", category: "other" },
      { name: "beer", category: "other" },
    ]);
  });

  it("passes through MenuItem[] unchanged", () => {
    const items = [
      { name: "mojito", category: "cocktail" },
      { name: "ipa", category: "beer" },
    ];
    expect(normalizeMenuItems(items)).toEqual(items);
  });

  it("handles mixed array (string + MenuItem)", () => {
    const result = normalizeMenuItems(["mojito", { name: "ipa", category: "beer" }]);
    expect(result).toEqual([
      { name: "mojito", category: "other" },
      { name: "ipa", category: "beer" },
    ]);
  });

  it("returns empty array for null/undefined", () => {
    expect(normalizeMenuItems(null)).toEqual([]);
    expect(normalizeMenuItems(undefined)).toEqual([]);
  });

  it("returns empty array for non-array", () => {
    expect(normalizeMenuItems("not an array")).toEqual([]);
    expect(normalizeMenuItems(42)).toEqual([]);
  });

  it("handles empty array", () => {
    expect(normalizeMenuItems([])).toEqual([]);
  });
});
