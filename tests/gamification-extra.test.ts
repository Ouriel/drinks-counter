import { describe, it, expect } from "vitest";
import {
  getAllEarnedBadges,
  getBadgeForCount,
  getSessionHue,
  getIconColor,
  getTipsyStyle,
  getPace,
  getNudge,
  getDrinkAchievements,
} from "@/lib/gamification";

// Build an ISO timestamp at a specific local hour (read back with getHours() in the
// same local zone, so the hour-based achievement branches are deterministic).
function atHour(hour: number, minute = 0): string {
  return new Date(2026, 0, 1, hour, minute, 0).toISOString();
}

describe("getBadgeForCount key", () => {
  it("exposes a stable i18n key alongside the English title", () => {
    expect(getBadgeForCount(1)?.key).toBe("begins");
    expect(getBadgeForCount(10)?.key).toBe("doubleDigits");
  });
});

describe("getAllEarnedBadges", () => {
  it("returns nothing at 0", () => {
    expect(getAllEarnedBadges(0)).toEqual([]);
  });

  it("returns every milestone at or below the total", () => {
    const badges = getAllEarnedBadges(3);
    expect(badges.map((badge) => badge.key)).toEqual(["begins", "warmingUp", "hatTrick"]);
  });

  it("returns all 11 milestones at 30", () => {
    expect(getAllEarnedBadges(30)).toHaveLength(11);
  });
});

describe("getSessionHue", () => {
  it("returns an hsl color string", () => {
    expect(getSessionHue(5)).toMatch(/^hsl\(/);
  });

  it("clamps progression at 20 drinks", () => {
    expect(getSessionHue(25)).toBe(getSessionHue(20));
  });

  it("differs between dark and light themes", () => {
    expect(getSessionHue(10, true)).not.toBe(getSessionHue(10, false));
  });
});

describe("getIconColor", () => {
  it("returns an hsl color string and clamps at 20", () => {
    expect(getIconColor(8)).toMatch(/^hsl\(/);
    expect(getIconColor(40)).toBe(getIconColor(20));
  });
});

describe("getTipsyStyle", () => {
  it("is empty below 3 drinks", () => {
    expect(getTipsyStyle(2)).toEqual({});
  });

  it("tilts (no shadow) between 3 and 6", () => {
    const style = getTipsyStyle(5);
    expect(style.transform).toContain("rotate");
    expect(style.textShadow).toBeUndefined();
  });

  it("adds a shadow between 7 and 11", () => {
    const style = getTipsyStyle(9);
    expect(style.transform).toContain("rotate");
    expect(style.textShadow).toBeTruthy();
  });

  it("keeps tilt and shadow at 12+", () => {
    const style = getTipsyStyle(20);
    expect(style.transform).toContain("rotate");
    expect(style.textShadow).toBeTruthy();
  });
});

describe("getPace edges", () => {
  it("returns null when the session is under 5 minutes old", () => {
    const drinks = [
      { id: "1", name: "beer", count: 2, category: "beer", createdAt: atHour(20, 0) },
    ];
    // createdAt is "now-ish" only if recent; use an actual recent timestamp.
    const recent = [
      {
        id: "1",
        name: "beer",
        count: 2,
        category: "beer",
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      },
    ];
    expect(getPace(recent)).toBeNull();
    expect(getPace(drinks)).not.toBeNull(); // old timestamp → measurable pace
  });

  it("rounds drinks-per-hour to one decimal", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const drinks = [{ id: "1", name: "beer", count: 3, category: "beer", createdAt: twoHoursAgo }];
    expect(getPace(drinks)?.dph).toBe(1.5);
  });
});

describe("getNudge additional branches", () => {
  it("returns the taxi nudge at 8", () => {
    expect(getNudge(8, 7)?.type).toBe("taxi");
  });

  it("returns the sleep/info nudge at 12 once the water nudge is suppressed", () => {
    // 12 % 3 === 0 so the water nudge would normally win; a non-alcoholic last drink
    // suppresses it, letting the 12-drink info nudge through.
    expect(getNudge(12, 11, "soft")?.type).toBe("info");
  });
});

describe("getDrinkAchievements branches", () => {
  it("flags explorer at 5+ unique drinks", () => {
    const drinks = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      name: `drink${index}`,
      count: 1,
      category: "beer",
    }));
    expect(getDrinkAchievements(drinks).some((item) => item.key === "explorer")).toBe(true);
  });

  it("flags adventurer and category master for variety", () => {
    const cats = ["beer", "wine", "cocktail", "spirit", "shot", "soft", "mocktail"];
    const drinks = Array.from({ length: 10 }, (_, index) => ({
      id: String(index),
      name: `drink${index}`,
      count: 1,
      category: cats[index % cats.length],
    }));
    const keys = getDrinkAchievements(drinks).map((item) => item.key);
    expect(keys).toContain("adventurer");
    expect(keys).toContain("categoryMaster");
  });

  it("flags devoted for a drink ordered 7+ times", () => {
    const drinks = [{ id: "1", name: "mojito", count: 7, category: "cocktail" }];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "devoted")).toBe(true);
  });

  it("flags escalation when starting soft and ending strong", () => {
    const drinks = [
      { id: "1", name: "beer", count: 1, category: "beer", createdAt: atHour(20) },
      { id: "2", name: "whiskey", count: 1, category: "spirit", createdAt: atHour(22) },
    ];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "escalation")).toBe(true);
  });

  it("flags night owl for a post-midnight last drink", () => {
    const drinks = [{ id: "1", name: "beer", count: 1, category: "beer", createdAt: atHour(2) }];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "nightOwl")).toBe(true);
  });

  it("flags happy hour and savoring for a long early session", () => {
    const drinks = [
      { id: "1", name: "beer", count: 1, category: "beer", createdAt: atHour(17) },
      { id: "2", name: "wine", count: 1, category: "wine", createdAt: atHour(22) },
    ];
    const keys = getDrinkAchievements(drinks).map((item) => item.key);
    expect(keys).toContain("happyHour");
    expect(keys).toContain("savoring");
  });

  it("flags the speed round for 3+ drinks within 30 minutes", () => {
    const drinks = [
      { id: "1", name: "beer", count: 2, category: "beer", createdAt: atHour(20, 0) },
      { id: "2", name: "shot", count: 1, category: "shot", createdAt: atHour(20, 20) },
    ];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "speedRound")).toBe(true);
  });

  it("flags the liver warning at 20+ drinks", () => {
    const drinks = [{ id: "1", name: "beer", count: 20, category: "beer" }];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "liverWarning")).toBe(true);
  });
});
