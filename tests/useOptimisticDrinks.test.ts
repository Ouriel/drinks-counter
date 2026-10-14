// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { renderHook } from "./helpers/render-hook";
import { useOptimisticDrinks } from "@/lib/useOptimisticDrinks";
import { api } from "@/lib/api";
import { toast } from "@heroui/react";
import type { Drink } from "@/lib/types";

vi.mock("@heroui/react", () => ({ toast: vi.fn() }));
vi.mock("@/lib/api", () => ({
  api: { addDrink: vi.fn(), patchDrink: vi.fn(), getDrinks: vi.fn() },
}));

const translate = (key: string) => key;
const beer: Drink = { id: "d1", name: "beer", count: 3, category: "beer" };
const toastTitles = (match: string) =>
  vi
    .mocked(toast)
    .mock.calls.map(([title]) => String(title))
    .filter((title) => title.includes(match));

function setup(initial: Drink[] = [beer], onBadge = vi.fn()) {
  const hook = renderHook(() => useOptimisticDrinks("fizzy-julep", translate, onBadge, initial));
  const tap = () => act(() => hook.result.current.increment(hook.result.current.drinks[0]));
  const undo = () => act(() => hook.result.current.decrement(hook.result.current.drinks[0]));
  return { hook, onBadge, tap, undo };
}

beforeEach(() => {
  vi.mocked(api.getDrinks).mockResolvedValue(null); // keep optimistic state; no refetch overwrite
  vi.mocked(api.addDrink).mockResolvedValue({ count: 0 });
  vi.mocked(api.patchDrink).mockResolvedValue({ ok: true });
  vi.mocked(api.patchDrink).mockClear();
  vi.mocked(toast).mockClear();
  localStorage.clear();
});

describe("useOptimisticDrinks", () => {
  it("swaps the temp id for the server id after adding a new drink", async () => {
    vi.mocked(api.addDrink).mockResolvedValue({
      drink: { id: "server-id", name: "mojito", count: 1, category: "cocktail" },
    });
    const { hook } = setup([]);
    await act(() => hook.result.current.addDrink("mojito", "cocktail"));
    expect(hook.result.current.drinks).toEqual([
      { id: "server-id", name: "mojito", count: 1, category: "cocktail" },
    ]);
  });

  it("rolls back an increment when the request fails", async () => {
    vi.mocked(api.addDrink).mockResolvedValue(null);
    const { hook } = setup();
    await act(() => hook.result.current.increment(beer));
    expect(hook.result.current.drinks[0].count).toBe(3);
    expect(hook.result.current.totalRef.current).toBe(3);
  });

  it("rolls back a decrement and the running total when the request fails", async () => {
    vi.mocked(api.patchDrink).mockResolvedValue(null);
    const { hook } = setup();
    await act(() => hook.result.current.decrement(beer));
    expect(hook.result.current.drinks[0].count).toBe(3);
    expect(hook.result.current.totalRef.current).toBe(3);
  });

  it("never PATCHes a temp id while the add is still in flight", async () => {
    let resolveAdd: (value: { drink: Drink }) => void = () => {};
    vi.mocked(api.addDrink).mockReturnValue(new Promise((resolve) => (resolveAdd = resolve)));
    const { hook } = setup([]);
    let adding: Promise<void> = Promise.resolve();
    act(() => {
      adding = hook.result.current.addDrink("mojito", "cocktail");
    });
    const temp = hook.result.current.drinks[0];
    expect(temp.id.startsWith("temp")).toBe(true);
    await act(() => hook.result.current.decrement(temp));
    expect(api.patchDrink).not.toHaveBeenCalled(); // PATCH {drinkId: "temp-…"} is a 400
    resolveAdd({ drink: { id: "server-id", name: "mojito", count: 1, category: "cocktail" } });
    await act(() => adding);
    expect(hook.result.current.drinks).toEqual([
      { id: "server-id", name: "mojito", count: 1, category: "cocktail" },
    ]);
  });

  it("removes the temp card when adding a new drink fails offline", async () => {
    vi.mocked(api.addDrink).mockResolvedValue(null);
    const { hook } = setup([]);
    await act(() => hook.result.current.addDrink("mojito", "cocktail"));
    expect(hook.result.current.drinks).toEqual([]);
    expect(hook.result.current.totalRef.current).toBe(0);
  });

  it("rolls back the +1 when re-adding an existing drink fails offline", async () => {
    vi.mocked(api.addDrink).mockResolvedValue(null);
    const { hook } = setup();
    await act(() => hook.result.current.addDrink("beer", "beer"));
    expect(hook.result.current.drinks[0].count).toBe(3);
    expect(hook.result.current.totalRef.current).toBe(3);
  });
});

describe("personal best fires once per session", () => {
  it("celebrates beating the previous best once, then stays quiet", async () => {
    localStorage.setItem("tipsytap_personal_best", "3");
    const { tap, onBadge } = setup();
    await tap(); // 4 → new record
    await tap(); // 5 → "On a Roll" badge, not a PB toast
    await tap(); // 6 → same record run
    expect(toastTitles("personalBest")).toHaveLength(1);
    expect(onBadge).toHaveBeenCalledTimes(2); // PB at 4 + badge at 5
    expect(localStorage.getItem("tipsytap_personal_best")).toBe("6"); // record still tracked
  });

  it("does not celebrate again after reloading the record-holding session", async () => {
    localStorage.setItem("tipsytap_personal_best", "3");
    await setup().tap(); // 4 → celebrated
    vi.mocked(toast).mockClear();
    await setup([{ ...beer, count: 4 }]).tap(); // page reloaded, 5th drink
    await setup([{ ...beer, count: 5 }]).tap(); // reloaded again, 6th drink
    expect(toastTitles("personalBest")).toHaveLength(0);
  });
});

describe("milestones do not repeat after undo + re-tap", () => {
  it("shows the Hat-Trick badge, water nudge and confetti once", async () => {
    const { tap, undo, onBadge } = setup([{ ...beer, count: 2 }]);
    await tap(); // 3 → Hat-Trick
    await undo(); // 2
    await tap(); // 3 again
    expect(toastTitles("hatTrick")).toHaveLength(1);
    expect(toastTitles("nudges.water")).toHaveLength(1);
    expect(onBadge).toHaveBeenCalledTimes(1);
  });
});
