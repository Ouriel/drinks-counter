import { describe, it, expect } from "vitest";
import { isAlcoholic, CATEGORIES } from "@/lib/constants";
import messages from "@/messages/en.json";

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
  it("has a label for every category and no extra label", () => {
    expect(new Set(CATEGORIES)).toEqual(new Set(Object.keys(messages.categories)));
  });
});
