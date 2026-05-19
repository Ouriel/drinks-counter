import { describe, it, expect } from "vitest";
import { sanitizeBarName, sanitizeDrinkName } from "@/lib/sanitize";

describe("sanitizeBarName", () => {
  it("trims and lowercases", () => {
    expect(sanitizeBarName("  Le Comptoir  ")).toBe("le comptoir");
  });

  it("removes special characters but keeps accents", () => {
    expect(sanitizeBarName("Café l'Étoile!@#$")).toBe("café l'étoile");
  });

  it("keeps hyphens and apostrophes", () => {
    expect(sanitizeBarName("O'Brien's Bar-Pub")).toBe("o'brien's bar-pub");
  });

  it("collapses multiple spaces", () => {
    expect(sanitizeBarName("the   big    bar")).toBe("the big bar");
  });

  it("truncates at 100 chars", () => {
    const long = "a".repeat(200);
    expect(sanitizeBarName(long).length).toBe(100);
  });

  it("removes emojis and symbols", () => {
    expect(sanitizeBarName("🍺 Beer House 🎉")).toBe("beer house");
  });

  it("handles empty input", () => {
    expect(sanitizeBarName("")).toBe("");
    expect(sanitizeBarName("   ")).toBe("");
  });
});

describe("sanitizeDrinkName", () => {
  it("trims and lowercases", () => {
    expect(sanitizeDrinkName("  Mojito  ")).toBe("mojito");
  });

  it("collapses whitespace", () => {
    expect(sanitizeDrinkName("Long   Island   Tea")).toBe("long island tea");
  });

  it("truncates at 80 chars", () => {
    const long = "a".repeat(100);
    expect(sanitizeDrinkName(long).length).toBe(80);
  });

  it("preserves special characters in drink names", () => {
    expect(sanitizeDrinkName("Piña Colada")).toBe("piña colada");
  });
});
