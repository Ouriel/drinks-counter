import { describe, it, expect } from "vitest";
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
  it("returns null with no drinks", () => {
    expect(getPace([])).toBeNull();
  });

  it("returns null with no createdAt", () => {
    expect(getPace([{ name: "beer", count: 1, category: null }])).toBeNull();
  });

  it("returns Taking It Slow for 1 drink/hour", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const drinks = [{ id: "1", name: "beer", count: 2, category: null, createdAt: twoHoursAgo }];
    expect(getPace(drinks)?.label).toBe("Taking It Slow");
  });

  it("returns Social Pace for ~1 drink every 30 min", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const drinks = [{ id: "1", name: "beer", count: 4, category: null, createdAt: twoHoursAgo }];
    expect(getPace(drinks)?.label).toBe("Social Pace");
  });

  it("returns a fast label for high pace", () => {
    const tenMinAgo = new Date(Date.now() - 600_000).toISOString();
    const drinks = [{ id: "1", name: "beer", count: 5, category: null, createdAt: tenMinAgo }];
    const pace = getPace(drinks);
    expect(["Off The Rails", "Send Help"]).toContain(pace?.label);
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
    expect(achievements.some((a) => a.text.includes("Rainbow"))).toBe(true);
  });

  it("returns Signature for drink with 4+ count", () => {
    const drinks = [{ id: "1", name: "mojito", count: 4, category: "cocktail" }];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((a) => a.text.includes("Signature"))).toBe(true);
  });

  it("returns Wildcard when all counts are 1 with 4+ drinks", () => {
    const drinks = [
      { id: "1", name: "a", count: 1, category: "beer" },
      { id: "2", name: "b", count: 1, category: "wine" },
      { id: "3", name: "c", count: 1, category: "cocktail" },
      { id: "4", name: "d", count: 1, category: "soft" },
    ];
    const achievements = getDrinkAchievements(drinks);
    expect(achievements.some((a) => a.text.includes("Wildcard"))).toBe(true);
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
});
