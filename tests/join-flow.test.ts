import { describe, it, expect } from "vitest";
import { pickJoinableSlug } from "@/lib/recent-sessions";

const HOUR = 3_600_000;
const now = Date.parse("2026-10-10T22:00:00Z");
const recent = (hoursAgo: number) =>
  JSON.stringify([
    { slug: "fizzy-julep", barName: "le salon", date: new Date(now - hoursAgo * HOUR) },
    { slug: "older-slug", barName: "the frog", date: new Date(now - 30 * HOUR) },
  ]);

// B5: a join link must not hijack yesterday's session (and overwrite its bar menu).
describe("pickJoinableSlug", () => {
  it("reuses tonight's latest session", () => {
    expect(pickJoinableSlug(recent(2), now)).toBe("fizzy-julep");
  });

  it("ignores a session from yesterday, even inside the 48 h TTL", () => {
    expect(pickJoinableSlug(recent(20), now)).toBeNull();
  });

  it("ignores a session dated in the future", () => {
    expect(pickJoinableSlug(recent(-1), now)).toBeNull();
  });

  it("ignores missing, malformed or undated storage", () => {
    expect(pickJoinableSlug(null, now)).toBeNull();
    expect(pickJoinableSlug("{oops", now)).toBeNull();
    expect(pickJoinableSlug('{"slug":"x"}', now)).toBeNull();
    expect(pickJoinableSlug('[{"slug":"x"}]', now)).toBeNull();
    expect(pickJoinableSlug("[]", now)).toBeNull();
  });
});
