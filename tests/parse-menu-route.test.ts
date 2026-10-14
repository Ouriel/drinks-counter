import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db, sessions, barMenus } from "@/lib/db";
import type { MenuItem } from "@/lib/types";
import { resetDb } from "./helpers/test-db";

const items = [{ name: "bière blonde", category: "beer" }];
const queuedScans: MenuItem[][] = []; // per-request model output; `items` once empty
let modelGate: Promise<void> | undefined; // when set, every model call waits for it

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

vi.mock("@/lib/ai", async () => {
  const { MockLanguageModelV4 } = await import("ai/test");
  return {
    getVisionModel: () => {
      const output = queuedScans.shift() ?? items;
      return new MockLanguageModelV4({
        doGenerate: async () => {
          await modelGate;
          return {
            content: [{ type: "text", text: JSON.stringify({ items: output }) }],
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 1, text: 1, reasoning: 0 },
            },
            warnings: [],
          };
        },
      });
    },
  };
});

const { POST } = await import("@/app/api/parse-menu/route");

function photoRequest(ip: string, bytes = new Uint8Array([1, 2, 3]), slug?: string) {
  const form = new FormData();
  form.append("photo", new File([bytes], "menu.jpg", { type: "image/jpeg" }));
  if (slug) form.append("slug", slug);
  return new NextRequest("http://localhost/api/parse-menu", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip },
  });
}

describe("POST /api/parse-menu", () => {
  it("returns the items parsed by the model", async () => {
    const response = await POST(photoRequest("10.0.0.1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items });
  });

  it("rejects a photo above 4 MB", async () => {
    const response = await POST(photoRequest("10.0.0.2", new Uint8Array(4 * 1024 * 1024 + 1)));
    expect(response.status).toBe(413);
  });

  it("rate-limits after 5 requests per IP", async () => {
    for (let attempt = 0; attempt < 5; attempt++) await POST(photoRequest("10.0.0.3"));
    expect((await POST(photoRequest("10.0.0.3"))).status).toBe(429);
  });
});

// B7 — a re-scan from the session screen was only kept in React state (lost on reload).
describe("POST /api/parse-menu with a session slug", () => {
  const beer = { name: "beer", category: "beer" };
  const spritz = { name: "spritz", category: "cocktail" };
  let ip = 100; // fresh IP per request: the route rate-limits 5/min per IP
  const scan = (slug?: string) => POST(photoRequest(`10.0.1.${++ip}`, undefined, slug));
  const barMenu = async () => (await db.select().from(barMenus))[0].items;

  beforeEach(async () => {
    await resetDb(db);
    const [menu] = await db
      .insert(barMenus)
      .values({ barName: "le salon", items: [beer] })
      .returning();
    const expiresAt = new Date(Date.now() + 3_600_000);
    await db.insert(sessions).values([
      { slug: "fizzy-julep", barMenuId: menu.id, expiresAt },
      { slug: "hoppy-stout", barMenuId: menu.id, expiresAt },
    ]);
  });

  it("saves the new items into the session's bar menu, once", async () => {
    queuedScans.push([beer, spritz, { name: "Spritz", category: "cocktail" }]);
    const response = await scan("fizzy-julep");
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(3); // response unchanged
    expect(await barMenu()).toEqual([beer, spritz]);
  });

  it("leaves bar menus alone without a slug (home and admin scans)", async () => {
    queuedScans.push([spritz]);
    await scan();
    expect(await barMenu()).toEqual([beer]);
  });

  it("keeps both new items when two sessions of the bar save at once", async () => {
    const mojito = { name: "mojito", category: "cocktail" };
    queuedScans.push([spritz], [mojito]);
    let openGate = () => {};
    modelGate = new Promise((resolve) => (openGate = resolve));
    const both = Promise.all([scan("fizzy-julep"), scan("hoppy-stout")]);
    await vi.waitFor(() => expect(queuedScans).toHaveLength(0)); // both requests reached the model
    openGate(); // ...and now read and write the bar menu side by side
    await both;
    modelGate = undefined;
    const menu = await barMenu();
    expect(menu).toHaveLength(3);
    expect(menu).toEqual(expect.arrayContaining([beer, spritz, mojito]));
  });
});
