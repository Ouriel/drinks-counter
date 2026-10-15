import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminApi } from "@/lib/api";

const calls: { url: string; init?: RequestInit }[] = [];
let body: unknown = {};
beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return Response.json(body);
    })
  );
});

// The admin page now goes through lib/api.ts like every other client call.
describe("adminApi", () => {
  it("sends the secret as a Bearer token and validates the bar list", async () => {
    body = {
      menus: [
        {
          id: "b1",
          barName: "le salon",
          items: [{ name: "ipa", category: "beer" }],
          createdAt: "2026-10-14T20:00:00.000Z",
        },
      ],
      stats: { totalBarMenus: 1 },
    };
    const data = await adminApi.bars("s3cret");
    expect(data?.menus[0].barName).toBe("le salon");
    expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe("Bearer s3cret");
  });

  it("reads sessions, tables and their details", async () => {
    body = {
      sessions: [
        { id: "s1", slug: "demo", nickname: null, drinkCount: 2, createdAt: "x", expiresAt: "y" },
      ],
    };
    expect((await adminApi.sessions("k"))?.sessions).toHaveLength(1);
    body = { tables: [{ id: "t1", code: "DEMO42", memberCount: 3, createdAt: "x" }] };
    expect((await adminApi.tables("k"))?.tables[0].code).toBe("DEMO42");
    body = { drinks: [{ name: "ipa", count: 2, category: "beer" }] };
    expect((await adminApi.sessionDrinks("k", "s1"))?.drinks).toHaveLength(1);
    expect(calls.at(-1)?.url).toBe("/api/admin?tab=session-detail&id=s1");
    body = { members: [{ nickname: "fox", slug: "demo", total: 2 }] };
    expect((await adminApi.tableMembers("k", "t1"))?.members[0].nickname).toBe("fox");
  });

  it("sends updates and deletes as JSON", async () => {
    body = { ok: true };
    await adminApi.updateBar("k", { id: "b1", items: [] });
    await adminApi.remove("k", "session", "s1");
    expect(calls.map((call) => call.init?.method)).toEqual(["PATCH", "DELETE"]);
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ type: "session", id: "s1" });
    expect(new Headers(calls[1].init?.headers).get("Content-Type")).toBe("application/json");
  });
});
