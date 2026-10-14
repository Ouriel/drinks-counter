import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db, barMenus } from "@/lib/db";
import { PATCH } from "@/app/api/admin/route";
import { POST as createSession } from "@/app/api/sessions/route";
import { jsonRequest, resetDb } from "./helpers/test-db";

vi.mock("@/lib/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/db")>();
  const { createTestDb } = await import("./helpers/test-db");
  return { ...real, db: await createTestDb(real) };
});

const rename = (id: string, barName: string) =>
  PATCH(
    new NextRequest("http://localhost/api/admin", {
      method: "PATCH",
      headers: { authorization: "Bearer admin-test-secret" },
      body: JSON.stringify({ id, barName }),
    })
  );
const barNames = async () => (await db.select().from(barMenus)).map((row) => row.barName).sort();

beforeEach(async () => {
  await resetDb(db);
  vi.stubEnv("ADMIN_SECRET", "admin-test-secret");
});

// Sessions look bars up by their sanitized name: a rename must store that form too, or the
// next "Le Comptoir" session silently creates a second, empty bar menu.
describe("admin bar rename", () => {
  it("stores the sanitized name so sessions keep finding the bar", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "comptoir" }).returning();
    expect((await rename(menu.id, "  Le Comptoir! ")).status).toBe(200);
    await createSession(jsonRequest("/api/sessions", "POST", { barName: "Le Comptoir" }));
    expect(await barNames()).toEqual(["le comptoir"]);
  });

  it("rejects a name that sanitizes to nothing", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "comptoir" }).returning();
    expect((await rename(menu.id, "!!!")).status).toBe(400);
    expect(await barNames()).toEqual(["comptoir"]);
  });

  it("rejects renaming onto another bar's name", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "comptoir" }).returning();
    await db.insert(barMenus).values({ barName: "le salon" });
    expect((await rename(menu.id, "Le Salon")).status).toBe(409);
    expect(await barNames()).toEqual(["comptoir", "le salon"]);
  });

  it("allows re-saving a bar under its own name", async () => {
    const [menu] = await db.insert(barMenus).values({ barName: "le salon" }).returning();
    expect((await rename(menu.id, "Le Salon")).status).toBe(200);
    expect(await barNames()).toEqual(["le salon"]);
  });
});
