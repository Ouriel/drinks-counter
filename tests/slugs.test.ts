import { describe, it, expect, vi } from "vitest";
import { generateSlug } from "@/lib/slugs";
import { addDrinkSchema } from "@/lib/schemas";

describe("generateSlug", () => {
  it("only produces slugs the drinks API accepts (every word of both lists)", () => {
    const random = vi.spyOn(Math, "random");
    for (let step = 0; step < 1000; step++) {
      random.mockReturnValue(step / 1000); // walks every index of lists shorter than 1000
      expect(addDrinkSchema.shape.slug.safeParse(generateSlug()).success).toBe(true);
    }
  });

  it("generates different slugs", () => {
    const slugs = new Set(Array.from({ length: 20 }, () => generateSlug()));
    expect(slugs.size).toBeGreaterThan(15);
  });
});
