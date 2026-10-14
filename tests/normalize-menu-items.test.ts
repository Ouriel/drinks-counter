import { describe, it, expect } from "vitest";
import { mergeMenuItems, normalizeMenuItems } from "@/lib/menu-items";

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

  it("skips malformed objects without name field", () => {
    const result = normalizeMenuItems([
      { category: "beer" },
      { name: "valid", category: "wine" },
      42,
    ]);
    expect(result).toEqual([{ name: "valid", category: "wine" }]);
  });

  it("defaults a missing or non-string category to other", () => {
    expect(normalizeMenuItems([{ name: "ipa" }, { name: "rum", category: 3 }])).toEqual([
      { name: "ipa", category: "other" },
      { name: "rum", category: "other" },
    ]);
  });
});

describe("mergeMenuItems", () => {
  const beer = { name: "beer", category: "beer" };
  const spritz = { name: "spritz", category: "cocktail" };
  const many = (count: number, prefix: string) =>
    Array.from({ length: count }, (_, index) => ({
      name: `${prefix} ${index}`,
      category: "other",
    }));

  it("adds only the names it doesn't have yet, case-insensitively", () => {
    expect(
      mergeMenuItems([beer], [beer, spritz, { name: " Spritz", category: "cocktail" }])
    ).toEqual([beer, spritz]);
  });

  it("never trims existing items above the cap", () => {
    const existing = many(250, "old");
    expect(mergeMenuItems(existing, [spritz])).toEqual(existing);
  });

  it("caps additions at 200 items in total", () => {
    expect(mergeMenuItems(many(150, "old"), many(200, "new"))).toHaveLength(200);
  });
});
