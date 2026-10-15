import { describe, it, expect } from "vitest";
import { formatNightDate } from "@/lib/dates";

// Design review L10: dates were numeric US ("10/14/2026") whatever the app language.
describe("formatNightDate", () => {
  it("writes the weekday and month in the app's language, not 10/14/2026", () => {
    const iso = "2026-10-14T12:00:00.000Z";
    expect(formatNightDate(iso, "en")).not.toMatch(/\d+\/\d+\/\d+/);
    expect(formatNightDate(iso, "en")).toMatch(/[A-Z][a-z]{2}/);
    expect(formatNightDate(iso, "fr")).not.toBe(formatNightDate(iso, "en"));
  });

  it("adds the time when asked", () => {
    const iso = "2026-10-14T12:00:00.000Z";
    expect(formatNightDate(iso, "en", true)).toMatch(/\d{2}:\d{2}/);
  });
});
