import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getBadgeForCount, getPace, getNudge, getDrinkAchievements } from "@/lib/gamification";

describe("getBadgeForCount", () => {
  it("returns the first badge at 1", () => {
    expect(getBadgeForCount(1)?.title).toBe("And So It Begins");
  });

  it("returns Hat-Trick at 3", () => {
    expect(getBadgeForCount(3)?.title).toBe("Hat-Trick");
  });

  it("returns Double Digits at 10", () => {
    expect(getBadgeForCount(10)?.title).toBe("Double Digits");
  });

  it("returns null for non-milestone counts", () => {
    expect(getBadgeForCount(4)).toBeNull();
    expect(getBadgeForCount(6)).toBeNull();
    expect(getBadgeForCount(9)).toBeNull();
  });
});

describe("getNudge", () => {
  it("returns water nudge every 3 drinks", () => {
    expect(getNudge(3, 2)?.type).toBe("water");
    expect(getNudge(6, 5)?.type).toBe("water");
    expect(getNudge(9, 8)?.type).toBe("water");
  });

  it("suppresses the water nudge when the added drink is non-alcoholic or food", () => {
    expect(getNudge(3, 2, "soft")).toBeNull();
    expect(getNudge(3, 2, "mocktail")).toBeNull();
    expect(getNudge(3, 2, "food")).toBeNull();
  });

  it("still shows the water nudge for alcoholic or unknown drinks", () => {
    expect(getNudge(3, 2, "beer")?.type).toBe("water");
    expect(getNudge(3, 2, null)?.type).toBe("water");
    expect(getNudge(3, 2)?.type).toBe("water");
  });

  it("returns taxi nudge at 8", () => {
    expect(getNudge(8, 7)?.type).toBe("taxi");
  });

  it("returns null when total unchanged", () => {
    expect(getNudge(3, 3)).toBeNull();
  });

  it("returns null for non-trigger counts", () => {
    expect(getNudge(2, 1)).toBeNull();
    expect(getNudge(4, 3)).toBeNull();
  });
});

describe("getPace", () => {
  const NOW = new Date("2026-10-10T22:00:00Z");
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("returns null with no drinks", () => {
    expect(getPace([])).toBeNull();
  });

  it("returns null with no createdAt", () => {
    expect(getPace([{ name: "beer", count: 1, category: null }])).toBeNull();
  });

  it("returns Cruising for 1 drink/hour", () => {
    const drinks = [{ name: "beer", count: 2, category: null, createdAt: ago(2 * 3_600_000) }];
    expect(getPace(drinks)).toMatchObject({ label: "Cruising", dph: 1 });
  });

  it("returns Picking It Up at exactly 2 drinks/hour (inclusive upper bound)", () => {
    const drinks = [{ name: "beer", count: 4, category: null, createdAt: ago(2 * 3_600_000) }];
    expect(getPace(drinks)).toMatchObject({ label: "Picking It Up", dph: 2 });
  });

  it("returns Send Help above 3.2 drinks/hour", () => {
    const drinks = [{ name: "beer", count: 5, category: null, createdAt: ago(600_000) }];
    expect(getPace(drinks)).toMatchObject({ label: "Send Help", dph: 30 });
  });
});

describe("getDrinkAchievements", () => {
  it("returns empty for no drinks", () => {
    expect(getDrinkAchievements([])).toEqual([]);
  });

  it("returns Rainbow drinker for 4+ categories", () => {
    const drinks = [
      { id: "1", name: "beer", count: 1, category: "beer" },
      { id: "2", name: "wine", count: 1, category: "wine" },
      { id: "3", name: "mojito", count: 1, category: "cocktail" },
      { id: "4", name: "water", count: 1, category: "soft" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.map((item) => item.key)).toContain("rainbow");
  });

  it("returns Signature for drink with 4+ count", () => {
    const drinks = [{ id: "1", name: "mojito", count: 4, category: "cocktail" }];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.find((item) => item.key === "signature")?.params).toEqual({
      name: "mojito",
    });
  });

  it("returns Wildcard when all counts are 1 with 4+ drinks", () => {
    const drinks = [
      { id: "1", name: "a", count: 1, category: "beer" },
      { id: "2", name: "b", count: 1, category: "wine" },
      { id: "3", name: "c", count: 1, category: "cocktail" },
      { id: "4", name: "d", count: 1, category: "soft" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.map((item) => item.key)).toContain("wildcard");
  });

  it("returns Designated driver when all drinks are alcohol-free", () => {
    const drinks = [
      { id: "1", name: "coke", count: 2, category: "soft" },
      { id: "2", name: "water", count: 1, category: "soft" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((item) => item.key === "designatedDriver")).toBe(true);
    expect(achievements.some((item) => item.key === "hydrationHero")).toBe(false);
  });

  it("returns Hydration hero with alcohol plus 3+ non-alcoholic drinks", () => {
    const drinks = [
      { id: "1", name: "beer", count: 2, category: "beer" },
      { id: "2", name: "water", count: 3, category: "soft" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((item) => item.key === "hydrationHero")).toBe(true);
    expect(achievements.some((item) => item.key === "designatedDriver")).toBe(false);
  });

  it("returns ateFood when a food item is logged", () => {
    const drinks = [
      { id: "1", name: "beer", count: 2, category: "beer" },
      { id: "2", name: "fries", count: 1, category: "food" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((item) => item.key === "ateFood")).toBe(true);
    expect(achievements.some((item) => item.key === "noFood")).toBe(false);
  });

  it("returns noFood with 5+ alcoholic drinks and no food", () => {
    const drinks = [{ id: "1", name: "beer", count: 5, category: "beer" }];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((item) => item.key === "noFood")).toBe(true);
    expect(achievements.some((item) => item.key === "ateFood")).toBe(false);
  });
});
