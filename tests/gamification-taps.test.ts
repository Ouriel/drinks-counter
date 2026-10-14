import { describe, it, expect, vi, afterEach } from "vitest";
import { getDrinkAchievements, getPace } from "@/lib/gamification";

// Local wall-clock times (read back with getHours() in the same zone → deterministic).
const at = (hour: number, minute = 0) => new Date(2026, 0, 1, hour, minute).toISOString();
// A drink row as the API returns it: createdAt = first tap, tappedAt = every tap.
const row = (name: string, category: string, taps: string[]) => ({
  name,
  category,
  count: taps.length,
  createdAt: taps[0],
  tappedAt: taps,
});
const keys = (drinks: Parameters<typeof getDrinkAchievements>[0]) =>
  getDrinkAchievements(drinks).map((item) => item.key);

describe("time-based achievements use individual taps (tappedAt)", () => {
  it("no speed round for 3 taps spread over 5 hours", () => {
    expect(keys([row("beer", "beer", [at(18), at(20), at(23)])])).not.toContain("speedRound");
  });

  it("speed round for 3 taps within 20 minutes", () => {
    expect(keys([row("shot", "shot", [at(22), at(22, 10), at(22, 20)])])).toContain("speedRound");
  });

  it("savoring for a single drink re-ordered over 4+ hours", () => {
    expect(keys([row("beer", "beer", [at(18), at(22, 30)])])).toContain("savoring");
  });

  it("night owl uses the last tap, not the row creation time", () => {
    const afterMidnight = new Date(2026, 0, 2, 1, 30).toISOString();
    expect(keys([row("beer", "beer", [at(22), afterMidnight])])).toContain("nightOwl");
  });

  it("escalation compares the first and last TAP, not row creation order", () => {
    // Beer first, whiskey in the middle, back to beer at the end → did not end strong.
    const drinks = [row("beer", "beer", [at(20), at(23)]), row("whiskey", "spirit", [at(21)])];
    expect(keys(drinks)).not.toContain("escalation");
  });
});

describe("pace uses individual taps (tappedAt)", () => {
  // One drink tapped 3 times over 5 hours.
  const beer = row("beer", "beer", [at(18), at(20, 30), at(23)]);
  afterEach(() => vi.useRealTimers());

  it("live pace runs from the first tap to now", () => {
    vi.useFakeTimers({ now: new Date(2026, 0, 1, 23) });
    expect(getPace([beer])?.dph).toBe(0.6); // 3 drinks / 5 h
  });

  it("summary pace runs from the first to the last tap and does not decay the next day", () => {
    vi.useFakeTimers({ now: new Date(2026, 0, 2, 18) }); // summary reopened the next evening
    expect(getPace([beer], new Date(at(23)).getTime())?.dph).toBe(0.6);
  });
});
