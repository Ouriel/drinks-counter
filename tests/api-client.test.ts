import { describe, it, expect, vi } from "vitest";
import { api } from "@/lib/api";

describe("api client", () => {
  it("returns null instead of throwing when the network is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(api.addDrink({ slug: "fizzy-julep", name: "beer" })).resolves.toBeNull();
  });

  it("returns null on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    await expect(api.getDrinks("fizzy-julep")).resolves.toBeNull();
  });

  it("validates the response shape", async () => {
    const body = {
      drinks: [{ id: "d1", name: "beer", count: 2, category: null }],
      sessionId: "s1",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(api.getDrinks("fizzy-julep")).resolves.toEqual(body);
  });
});
