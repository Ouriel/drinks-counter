import { describe, it, expect } from "vitest";
import { generateSlug } from "@/lib/slugs";

describe("generateSlug", () => {
  it("returns a string with format adjective-noun-extra", () => {
    const slug = generateSlug();
    const parts = slug.split("-");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(2));
  });

  it("generates different slugs", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateSlug()));
    expect(slugs.size).toBeGreaterThan(15);
  });

  it("uses only lowercase characters and hyphens", () => {
    for (let i = 0; i < 20; i++) {
      const slug = generateSlug();
      expect(slug).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
    }
  });
});
