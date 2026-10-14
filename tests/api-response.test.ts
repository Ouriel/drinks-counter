import { describe, it, expect } from "vitest";
import { DrinksResponse, AddDrinkResponse, PatchDrinkResponse } from "@/lib/api";

describe("client response schemas (zod/mini)", () => {
  it("parses drinks with nullable category and optional fields", () => {
    const data = { drinks: [{ id: "a", name: "ipa", count: 2, category: null }], sessionId: "s" };
    expect(DrinksResponse.parse(data)).toEqual(data);
  });
  it("rejects a malformed drink", () => {
    expect(() => DrinksResponse.parse({ drinks: [{ id: 1 }], sessionId: "s" })).toThrow();
  });
  it("accepts both add-drink shapes and patch shapes", () => {
    expect(AddDrinkResponse.parse({ count: 3 })).toEqual({ count: 3 });
    expect(PatchDrinkResponse.parse({ deleted: true })).toEqual({ deleted: true });
    expect(() => PatchDrinkResponse.parse({ ok: false })).toThrow();
  });
});
