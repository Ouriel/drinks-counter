import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slugs";

describe("generateSlug", () => {
  it("returns a string with format adjective-noun-number", () => {
    const slug = generateSlug();
    const parts = slug.split("-");
    expect(parts).toHaveLength(3);
    expect(parts[2]).toMatch(/^\d+$/);
  });

  it("generates number between 1 and 99", () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateSlug();
      const num = parseInt(slug.split("-")[2]);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(99);
    }
  });

  it("generates different slugs", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateSlug()));
    // With 25k+ combinations, 20 random slugs should be mostly unique
    expect(slugs.size).toBeGreaterThan(10);
  });

  it("uses only lowercase characters and hyphens", () => {
    for (let i = 0; i < 20; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    }
  });
});
