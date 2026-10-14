import { describe, it, expect } from "vitest";
import { addRecentSession } from "@/lib/recent-sessions";

const NOW = Date.parse("2026-10-14T22:00:00Z");
const entry = (slug: string, hoursAgo: number) => ({
  slug,
  barName: slug,
  date: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
});

describe("addRecentSession", () => {
  it("keeps sessions newest-started first, so a join link still picks tonight's", () => {
    const stored = JSON.stringify([entry("tonight", 1)]);
    expect(addRecentSession(stored, entry("yesterday", 30)).map((item) => item.slug)).toEqual([
      "tonight",
      "yesterday",
    ]);
  });

  it("keeps the first known start date when a session is opened again", () => {
    const stored = JSON.stringify([entry("tonight", 3)]);
    expect(addRecentSession(stored, entry("tonight", 0))).toEqual([entry("tonight", 3)]);
  });

  it("keeps the 10 most recent, and survives broken storage", () => {
    const stored = JSON.stringify(
      Array.from({ length: 10 }, (_, index) => entry(`s${index}`, index + 1))
    );
    const updated = addRecentSession(stored, entry("new", 0));
    expect(updated).toHaveLength(10);
    expect(updated[0].slug).toBe("new");
    expect(addRecentSession("{oops", entry("new", 0))).toEqual([entry("new", 0)]);
  });
});
