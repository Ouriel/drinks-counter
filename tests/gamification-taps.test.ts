import { describe, it, expect } from "vitest";
import { getDrinkAchievements } from "@/lib/gamification";

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
  it("speed round for 3 taps within 20 minutes", () => {
    expect(keys([row("shot", "shot", [at(22), at(22, 10), at(22, 20)])])).toContain("speedRound");
  });
});
