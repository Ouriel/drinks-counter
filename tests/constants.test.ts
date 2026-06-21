import { describe, it, expect } from "vitest";
import { isAlcoholic, CATEGORIES, CATEGORY_EMOJI } from "@/lib/constants";

describe("isAlcoholic", () => {
  it("returns true for alcoholic categories", () => {
    for (const category of ["beer", "wine", "cocktail", "spirit", "shot"]) {
      expect(isAlcoholic(category)).toBe(true);
    }
  });

  it("returns false for non-alcoholic categories", () => {
    for (const category of ["soft", "mocktail", "food", "other"]) {
      expect(isAlcoholic(category)).toBe(false);
    }
  });

  it("returns false for null/unknown", () => {
    expect(isAlcoholic(null)).toBe(false);
    expect(isAlcoholic("smoothie")).toBe(false);
  });
});

describe("CATEGORIES", () => {
  it("lists every emoji-mapped category", () => {
    expect(CATEGORIES).toEqual(Object.keys(CATEGORY_EMOJI));
    expect(CATEGORIES).toContain("beer");
    expect(CATEGORIES).toContain("other");
  });
});
