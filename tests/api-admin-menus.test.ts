import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db, barMenus } from "@/lib/db";
import * as admin from "@/app/api/admin/route";
import { GET as searchMenus } from "@/app/api/menus/route";
import { resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

const adminReq = (method: string, token: string | null, body?: unknown) =>
  new NextRequest("http://localhost/api/admin", {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(async () => {
  await resetDb(db);
  vi.stubEnv("ADMIN_SECRET", "admin-test-secret");
});

describe("/api/admin auth gate", () => {
  it.each(["GET", "PATCH", "DELETE"] as const)(
    "%s returns 401 without the right secret",
    async (method) => {
      for (const token of [null, "wrong-test-secret"]) {
        const res = await admin[method](adminReq(method, token, method === "GET" ? undefined : {}));
        expect(res.status).toBe(401);
      }
    }
  );

  it("returns 401 for every request when ADMIN_SECRET is unset", async () => {
    vi.stubEnv("ADMIN_SECRET", "");
    expect((await admin.GET(adminReq("GET", ""))).status).toBe(401);
  });

  it("PATCH renames a bar menu with the right secret", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "old name" }).returning();
    const res = await admin.PATCH(
      adminReq("PATCH", "admin-test-secret", { id: menu.id, barName: "new name" })
    );
    expect(res.status).toBe(200);
    expect((await db.select().from(barMenus))[0].barName).toBe("new name");
  });
});

describe("GET /api/menus", () => {
  it("matches every token, shortest name first", async () => {
    await db
      .insert(barMenus)
      .values([
        { barName: "le petit salon de the" },
        { barName: "le salon" },
        { barName: "chez paul" },
      ]);
    const res = await searchMenus(new NextRequest("http://localhost/api/menus?q=Salon%20LE"));
    const { menus } = await res.json();
    expect(menus.map((menu: { barName: string }) => menu.barName)).toEqual([
      "le salon",
      "le petit salon de the",
    ]);
  });

  it("ignores queries shorter than 2 characters", async () => {
    const res = await searchMenus(new NextRequest("http://localhost/api/menus?q=a"));
    expect(await res.json()).toEqual({ menus: [] });
  });
});
