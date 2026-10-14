import { describe, it, expect, vi } from "vitest";
import { ANIMALS, generateNickname, pickUniqueNickname, formatNickname } from "@/lib/nicknames";

const keys = new Set(ANIMALS.map((animal) => animal.key));

describe("generateNickname", () => {
  it("returns a key that exists in ANIMALS", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      expect(keys.has(generateNickname())).toBe(true);
    }
  });
});

describe("pickUniqueNickname", () => {
  it("returns a key not already taken", () => {
    const taken = new Set([...keys].slice(0, 10));
    const picked = pickUniqueNickname(taken);
    expect(taken.has(picked)).toBe(false);
    expect(keys.has(picked)).toBe(true);
  });

  it("falls back to the first free key when the random draws keep colliding", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // always draws ANIMALS[0]
    expect(pickUniqueNickname(new Set([ANIMALS[0].key]))).toBe(ANIMALS[1].key);
  });

  it("returns some key even when every key is taken", () => {
    const picked = pickUniqueNickname(new Set(keys));
    expect(keys.has(picked)).toBe(true);
  });
});

describe("formatNickname", () => {
  it("returns ??? for null", () => {
    expect(formatNickname(null, (key) => key)).toBe("???");
  });

  it("returns emoji + translated name for a known key", () => {
    expect(formatNickname("fox", (key) => key.toUpperCase())).toBe("🦊 FOX");
  });

  it("returns the stored value as-is for an unknown/legacy nickname", () => {
    expect(formatNickname("LegacyName", (key) => key)).toBe("LegacyName");
  });
});
