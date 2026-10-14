import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Live Nominatim responses recorded on 2026-10-13, trimmed to the fields route.ts reads.
import fixtures from "./fixtures/nominatim.json";

// Fresh module per call (resets the 1 req/s limiter); fetch is mocked, no live calls.
async function search(query: string, response: unknown[]) {
  vi.resetModules();
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json(response));
  vi.stubGlobal("fetch", fetchMock);
  const { GET } = await import("@/app/api/bars/search/route");
  const res = await GET(new NextRequest(`http://localhost/api/bars/search?${query}`));
  const { results } = await res.json();
  const [url, init] = fetchMock.mock.calls[0];
  return { sent: new URL(String(url)).searchParams, init, results };
}

describe("GET /api/bars/search", () => {
  it("asks Nominatim for POIs inside a hard box around a ~1 km position", async () => {
    const { sent, init } = await search("q=paradiso&lat=41.38512&lng=2.17349", []);
    expect(init?.signal).toBeInstanceOf(AbortSignal); // 5 s timeout
    expect(sent.get("layer")).toBe("poi");
    expect(sent.get("bounded")).toBe("1");
    expect(sent.get("viewbox")).toBe("2.12,41.44,2.22,41.34");
    expect(sent.has("extratags")).toBe(false);
  });

  it("drops non-venue amenities such as a concert hall 1,241 km away", async () => {
    const { results } = await search("q=paradiso&lat=41.385&lng=2.173", fixtures.paradiso_soft);
    expect(results).toEqual([]);
  });

  it("puts the nearest place first", async () => {
    const { results } = await search("q=la+perle&lat=48.86&lng=2.36", fixtures.perle_bounded);
    expect(results.map((place: { address: string }) => place.address)).toEqual([
      "Rue Vieille du Temple, Paris",
      "Rue de Laghouat, Paris",
    ]);
  });

  it("searches worldwide POIs without a position and keeps Nominatim's order", async () => {
    const { sent, results } = await search("q=kenavo", fixtures.kenavo_poi);
    expect(sent.get("layer")).toBe("poi");
    expect(sent.has("viewbox")).toBe(false);
    expect(results.map((place: { name: string }) => place.name)).toEqual(["Kenavo", "Le Kenavo"]);
  });
});
