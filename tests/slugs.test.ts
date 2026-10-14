import { describe, it, expect, vi } from "vitest";
import { randomInt } from "crypto";
import { generateSlug } from "@/lib/slugs";
import { addDrinkSchema } from "@/lib/schemas";

vi.mock("crypto", async (importOriginal) => {
  const real = await importOriginal<typeof import("crypto")>();
  return { ...real, randomInt: vi.fn(real.randomInt) };
});

// A generated slug is the session's only access key: adjective-noun plus a 4-char random suffix.
const SLUG = /^[a-z]+-[a-z-]+-[a-hj-np-z2-9]{4}$/;

describe("generateSlug", () => {
  it("returns adjective-noun-xxxx", () => {
    for (let step = 0; step < 50; step++) expect(generateSlug()).toMatch(SLUG);
  });

  it("does not depend on Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(new Set(Array.from({ length: 50 }, () => generateSlug())).size).toBe(50);
  });

  it("only produces slugs the drinks API accepts (every word of both lists)", () => {
    for (let step = 0; step < 1000; step++) {
      // walks every index of lists shorter than 1000
      vi.mocked(randomInt).mockImplementation(((max: number) => step % max) as typeof randomInt);
      expect(addDrinkSchema.shape.slug.safeParse(generateSlug()).success).toBe(true);
    }
  });
});
