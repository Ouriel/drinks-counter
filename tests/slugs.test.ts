import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slugs";

describe("generateSlug", () => {
  it("returns a string with format adjective-noun", () => {
    const slug = generateSlug();
    const parts = slug.split("-");
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(2);
    expect(parts[1].length).toBeGreaterThan(2);
  });

  it("generates different slugs", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateSlug()));
    expect(slugs.size).toBeGreaterThan(10);
  });

  it("uses only lowercase characters and hyphens", () => {
    for (let i = 0; i < 20; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[a-z]+-[a-z]+$/);
    }
  });
});
