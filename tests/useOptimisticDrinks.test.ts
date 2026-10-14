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

function setup(initial: Drink[] = [beer], onBadge = vi.fn()) {
  const hook = renderHook(() => useOptimisticDrinks("fizzy-julep", translate, onBadge, initial));
  return { hook, onBadge };
}

beforeEach(() => {
  vi.mocked(api.getDrinks).mockResolvedValue(null); // keep optimistic state; no refetch overwrite
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

  it("rolls back a decrement when the request fails", async () => {
    vi.mocked(api.patchDrink).mockResolvedValue(null);
    const { hook } = setup();
    await act(() => hook.result.current.decrement(beer));
    expect(hook.result.current.drinks[0].count).toBe(3);
  });
});
