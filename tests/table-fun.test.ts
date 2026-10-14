import { describe, it, expect } from "vitest";
import { getTableMilestone, getRankingMoves, getTableAwards } from "@/lib/gamification";

describe("getTableMilestone", () => {
  it("fires once when the group total crosses a milestone", () => {
    expect(getTableMilestone(9, 10)).toBe(10);
    expect(getTableMilestone(10, 11)).toBeNull();
    expect(getTableMilestone(20, 26)).toBe(25);
  });

  it("reports the highest milestone when a refresh jumps over several", () => {
    expect(getTableMilestone(8, 27)).toBe(25);
  });

  it("stays quiet when the total goes down", () => {
    expect(getTableMilestone(11, 9)).toBeNull();
  });
});

describe("getRankingMoves", () => {
  it("returns how much each member went up since the previous refresh", () => {
    const before = [
      { nickname: "fox", total: 2 },
      { nickname: "owl", total: 3 },
    ];
    const after = [
      { nickname: "fox", total: 4 },
      { nickname: "owl", total: 3 },
      { nickname: "bee", total: 1 },
    ];
    expect(getRankingMoves(before, after)).toEqual({ fox: 2 });
  });

  it("shows nothing on the first load", () => {
    expect(getRankingMoves(null, [{ nickname: "fox", total: 4 }])).toEqual({});
  });
});

const at = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 14, hour, minute)).toISOString();

describe("getTableAwards", () => {
  const fox = {
    nickname: "fox",
    total: 6,
    distinct: 5,
    alcoholFree: 0,
    firstTap: at(19),
    lastTap: at(23, 30),
  };
  const owl = {
    nickname: "owl",
    total: 4,
    distinct: 2,
    alcoholFree: 3,
    firstTap: at(18),
    lastTap: at(19),
  };

  it("gives each award to the member who earned it", () => {
    expect(getTableAwards([fox, owl])).toEqual([
      { key: "explorer", nickname: "fox" },
      { key: "hydration", nickname: "owl" },
      { key: "pace", nickname: "owl" }, // 4 in 1 h beats 6 in 4.5 h
      { key: "nightOwl", nickname: "fox" },
      { key: "firstSip", nickname: "owl" },
    ]);
  });

  it("needs at least two members", () => {
    expect(getTableAwards([fox])).toEqual([]);
  });

  it("skips an award nobody really earned", () => {
    const quiet = { ...owl, alcoholFree: 0, distinct: 1, total: 2 };
    expect(
      getTableAwards([{ ...fox, distinct: 1, total: 2 }, quiet]).map((award) => award.key)
    ).toEqual(["nightOwl", "firstSip"]);
  });
});
