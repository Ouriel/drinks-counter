import { describe, it, expect } from "vitest";

// Replicate the sanitize function for testing (same logic as in API routes)
function sanitize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function buildTokens(query: string): string[] | null {
  const sanitized = sanitize(query);
  if (!sanitized) return null;
  const tokens = sanitized.split(" ").filter((t) => t.length >= 2);
  return tokens.length > 0 ? tokens : null;
}

describe("sanitize", () => {
  it("trims and lowercases", () => {
    expect(sanitize("  Le Comptoir  ")).toBe("le comptoir");
  });

  it("removes special characters but keeps accents", () => {
    expect(sanitize("Café l'Étoile!@#$")).toBe("café l'étoile");
  });

  it("keeps hyphens and apostrophes", () => {
    expect(sanitize("O'Brien's Bar-Pub")).toBe("o'brien's bar-pub");
  });

  it("collapses multiple spaces", () => {
    expect(sanitize("the   big    bar")).toBe("the big bar");
  });

  it("truncates at 100 chars", () => {
    const long = "a".repeat(200);
    expect(sanitize(long).length).toBe(100);
  });

  it("removes emojis and symbols", () => {
    expect(sanitize("🍺 Beer House 🎉")).toBe("beer house");
  });

  it("handles empty input", () => {
    expect(sanitize("")).toBe("");
    expect(sanitize("   ")).toBe("");
  });
});

describe("buildTokens (fuzzy search)", () => {
  it("splits into tokens of 2+ chars", () => {
    expect(buildTokens("le comptoir")).toEqual(["le", "comptoir"]);
  });

  it("filters out single-char tokens", () => {
    expect(buildTokens("a b cd ef")).toEqual(["cd", "ef"]);
  });

  it("returns null for empty/too-short input", () => {
    expect(buildTokens("")).toBeNull();
    expect(buildTokens("a")).toBeNull();
    expect(buildTokens("  x  ")).toBeNull();
  });

  it("handles accented search", () => {
    expect(buildTokens("café")).toEqual(["café"]);
  });

  it("partial bar name matches work", () => {
    // "compt" should be a token that would match "comptoir" via ILIKE %compt%
    const tokens = buildTokens("compt");
    expect(tokens).toEqual(["compt"]);
  });
});
