import { describe, it, expect } from "vitest";
import { recordNight, summarizeNight, withTap, type Night } from "@/lib/nights";

const night = (slug: string, daysAgo: number, total = 3): Night => ({
  slug,
  barName: "le salon",
  date: new Date(Date.UTC(2026, 9, 14 - daysAgo, 20)).toISOString(),
  total,
  topDrink: "ipa",
});

describe("summarizeNight", () => {
  it("counts the drinks and names the most ordered one", () => {
    expect(
      summarizeNight([
        { name: "ipa", count: 2 },
        { name: "spritz", count: 3 },
      ])
    ).toEqual({ total: 5, topDrink: "spritz" });
    expect(summarizeNight([])).toEqual({ total: 0, topDrink: null });
  });
});

describe("withTap", () => {
  it("applies the +1 or −1 a tap is about to make", () => {
    const drinks = [{ id: "d1", name: "ipa", count: 1, category: "beer" }];
    expect(withTap(drinks, "IPA", 1).map((drink) => drink.count)).toEqual([2]);
    expect(withTap(drinks, "ipa", -1)).toEqual([]);
    expect(withTap(drinks, "spritz", 1, "cocktail").map((drink) => drink.name)).toEqual([
      "ipa",
      "spritz",
    ]);
  });
});

describe("recordNight", () => {
  it("updates tonight's entry in place and keeps its first start date", () => {
    const stored = JSON.stringify([night("tonight", 0, 2), night("last-week", 7)]);
    const updated = recordNight(stored, {
      ...night("tonight", 0, 5),
      date: "2026-10-14T23:00:00.000Z",
    });
    expect(updated.map((entry) => [entry.slug, entry.total])).toEqual([
      ["tonight", 5],
      ["last-week", 3],
    ]);
    expect(updated[0].date).toBe(night("tonight", 0).date);
  });

  it("keeps the 20 most recent nights and survives broken storage", () => {
    const stored = JSON.stringify(
      Array.from({ length: 20 }, (_, index) => night(`n${index}`, index + 1))
    );
    const updated = recordNight(stored, night("new", 0));
    expect(updated).toHaveLength(20);
    expect(updated[0].slug).toBe("new");
    expect(recordNight("{oops", night("new", 0))).toEqual([night("new", 0)]);
  });
});
