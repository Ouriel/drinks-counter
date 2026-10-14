import { describe, it, expect, vi, afterEach } from "vitest";
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
  it("goes from cool blue to warm amber and clamps at 20 drinks", () => {
    expect(getSessionHue(0)).toBe("hsl(210, 30%, 10%)");
    expect(getSessionHue(20)).toBe("hsl(30, 80%, 15%)");
    expect(getSessionHue(25)).toBe(getSessionHue(20));
  });

  it("uses a light background in light mode", () => {
    expect(getSessionHue(0, false)).toBe("hsl(210, 30%, 94%)");
    expect(getSessionHue(20, false)).toBe("hsl(30, 80%, 88%)");
  });
});

describe("getIconColor", () => {
  it("goes from amber to deep orange per theme and clamps at 20", () => {
    expect(getIconColor(0)).toBe("hsl(45, 90%, 58%)");
    expect(getIconColor(20)).toBe("hsl(12, 98%, 50%)");
    expect(getIconColor(0, false)).toBe("hsl(45, 90%, 45%)");
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
  const NOW = new Date("2026-10-10T22:00:00Z");
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  afterEach(() => vi.useRealTimers());

  it("returns null when the session is under 5 minutes old", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(
      getPace([{ name: "beer", count: 2, category: "beer", createdAt: ago(60_000) }])
    ).toBeNull();
    expect(
      getPace([{ name: "beer", count: 2, category: "beer", createdAt: ago(600_000) }])
    ).not.toBeNull();
  });

  it("rounds drinks-per-hour to one decimal", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const drinks = [{ name: "beer", count: 2, category: "beer", createdAt: ago(3 * 3_600_000) }];
    expect(getPace(drinks)?.dph).toBe(0.7); // 2 / 3h = 0.666…
  });
});

describe("getNudge additional branches", () => {
  it("lets the 12-drink 'stopping soon' nudge win over the water break", () => {
    expect(getNudge(12, 11, "beer")).toMatchObject({ type: "info", emoji: "👀" });
    expect(getNudge(12, 11, "soft")?.type).toBe("info");
  });
});

describe("getDrinkAchievements on legacy rows without tappedAt", () => {
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
      { id: "1", name: "beer", count: 1, category: "beer", createdAt: atHour(20, 0) },
      { id: "2", name: "wine", count: 1, category: "wine", createdAt: atHour(20, 10) },
      { id: "3", name: "shot", count: 1, category: "shot", createdAt: atHour(20, 20) },
    ];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "speedRound")).toBe(true);
  });

  it("flags the liver warning at 20+ drinks", () => {
    const drinks = [{ id: "1", name: "beer", count: 20, category: "beer" }];
    expect(getDrinkAchievements(drinks).some((item) => item.key === "liverWarning")).toBe(true);
  });
});
