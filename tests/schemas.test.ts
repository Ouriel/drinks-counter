import { describe, it, expect } from "vitest";
import {
  createSessionSchema,
  addDrinkSchema,
  patchDrinkSchema,
  adminPatchSchema,
  parseBody,
} from "../lib/schemas";

describe("createSessionSchema", () => {
  it("accepts valid session with bar name and items", () => {
    const result = createSessionSchema.safeParse({
      barName: "Le Salon",
      menuItems: [{ name: "mojito", category: "cocktail" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty body (no bar, no items)", () => {
    const result = createSessionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts string menu items (legacy format)", () => {
    const result = createSessionSchema.safeParse({
      barName: "Test",
      menuItems: ["beer", "wine"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects bar name over 100 chars", () => {
    const result = createSessionSchema.safeParse({
      barName: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects menuItems over 200 items", () => {
    const items = Array.from({ length: 201 }, (_, i) => ({ name: `drink${i}`, category: "beer" }));
    const result = createSessionSchema.safeParse({ menuItems: items });
    expect(result.success).toBe(false);
  });

  it("accepts null barName", () => {
    const result = createSessionSchema.safeParse({ barName: null });
    expect(result.success).toBe(true);
  });
});

describe("addDrinkSchema", () => {
  it("accepts valid drink", () => {
    const result = addDrinkSchema.safeParse({
      slug: "fizzy-julep-cheers",
      name: "mojito",
      category: "cocktail",
    });
    expect(result.success).toBe(true);
  });

  it("accepts drink without category", () => {
    const result = addDrinkSchema.safeParse({
      slug: "fizzy-julep-cheers",
      name: "mystery drink",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty slug", () => {
    const result = addDrinkSchema.safeParse({ slug: "", name: "beer" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = addDrinkSchema.safeParse({ slug: "test", name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 100 chars", () => {
    const result = addDrinkSchema.safeParse({ slug: "test", name: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("patchDrinkSchema", () => {
  it("accepts delta +1", () => {
    const result = patchDrinkSchema.safeParse({
      slug: "test-slug",
      drinkId: "550e8400-e29b-41d4-a716-446655440000",
      delta: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts delta -1", () => {
    const result = patchDrinkSchema.safeParse({
      slug: "test-slug",
      drinkId: "550e8400-e29b-41d4-a716-446655440000",
      delta: -1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects delta 0", () => {
    const result = patchDrinkSchema.safeParse({
      slug: "test-slug",
      drinkId: "550e8400-e29b-41d4-a716-446655440000",
      delta: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects delta 2", () => {
    const result = patchDrinkSchema.safeParse({
      slug: "test-slug",
      drinkId: "550e8400-e29b-41d4-a716-446655440000",
      delta: 2,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID drinkId", () => {
    const result = patchDrinkSchema.safeParse({
      slug: "test-slug",
      drinkId: "not-a-uuid",
      delta: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe("adminPatchSchema", () => {
  it("accepts valid admin patch with items", () => {
    const result = adminPatchSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      items: [{ name: "beer", category: "beer" }],
      barName: "New Name",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID id", () => {
    const result = adminPatchSchema.safeParse({
      id: "bad-id",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects items over 200", () => {
    const items = Array.from({ length: 201 }, (_, i) => ({ name: `d${i}`, category: "beer" }));
    const result = adminPatchSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      items,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseBody helper", () => {
  it("returns data on valid input", () => {
    const result = parseBody(addDrinkSchema, { slug: "test", name: "beer" });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.slug).toBe("test");
    }
  });

  it("returns error on invalid input", () => {
    const result = parseBody(addDrinkSchema, { slug: "", name: "" });
    expect("error" in result).toBe(true);
  });

  it("returns error on completely wrong shape", () => {
    const result = parseBody(addDrinkSchema, "not an object");
    expect("error" in result).toBe(true);
  });
});
