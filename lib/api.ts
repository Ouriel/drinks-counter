import { z } from "zod";
import type { MenuItem } from "./types";

// === Response Schemas ===

const drinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  category: z.string().nullable(),
  tappedAt: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
});

const sessionInfoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  barName: z.string().nullable(),
  tableCode: z.string().nullable(),
  nickname: z.string().nullable(),
});

export const DrinksResponse = z.object({
  drinks: z.array(drinkSchema),
  sessionId: z.string(),
});

export const SessionResponse = z.object({
  session: sessionInfoSchema,
  menuItems: z.array(z.object({ name: z.string(), category: z.string() })),
});

export const CreateSessionResponse = z.object({ slug: z.string() });

export const AddDrinkResponse = z.union([
  z.object({ drink: drinkSchema }),
  z.object({ count: z.number() }),
]);

export const PatchDrinkResponse = z.union([
  z.object({ ok: z.literal(true) }),
  z.object({ deleted: z.literal(true) }),
]);

export const MenusResponse = z.object({
  menus: z.array(
    z.object({
      id: z.string(),
      barName: z.string(),
      items: z.array(z.object({ name: z.string(), category: z.string() })),
    })
  ),
});

export const BarSearchResponse = z.object({
  results: z.array(
    z.object({
      name: z.string(),
      address: z.string(),
    })
  ),
});

export const TableRankingResponse = z.object({
  code: z.string(),
  members: z.array(z.object({ nickname: z.string(), total: z.number() })),
});

export const TableCreateResponse = z.object({ code: z.string(), nickname: z.string() });

export const RerollResponse = z.object({ nickname: z.string() });

export const TableStatsResponse = z.object({
  code: z.string(),
  total: z.number(),
  members: z.array(z.object({ nickname: z.string(), total: z.number() })),
  byCategory: z.array(z.object({ category: z.string(), count: z.number() })),
  topDrinks: z.array(
    z.object({ name: z.string(), category: z.string().nullable(), count: z.number() })
  ),
});

export const MemberDrinksResponse = z.object({
  drinks: z.array(
    z.object({ name: z.string(), count: z.number(), category: z.string().nullable() })
  ),
});

export const ParseMenuResponse = z.object({
  items: z.array(z.object({ name: z.string(), category: z.string() })),
});

// === Typed Fetch Helper ===

async function apiFetch<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit
): Promise<T | null> {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  const data = await res.json();
  return schema.parse(data);
}

export const api = {
  getDrinks(slug: string) {
    return apiFetch(`/api/drinks?slug=${slug}`, DrinksResponse);
  },

  getSession(slug: string) {
    return apiFetch(`/api/sessions?slug=${slug}`, SessionResponse);
  },

  createSession(body: { barName?: string | null; menuItems?: MenuItem[]; slug?: string }) {
    return apiFetch("/api/sessions", CreateSessionResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  addDrink(body: { slug: string; name: string; category?: string }) {
    return apiFetch("/api/drinks", AddDrinkResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  patchDrink(body: { slug: string; drinkId: string; delta: 1 | -1 }) {
    return apiFetch("/api/drinks", PatchDrinkResponse, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  searchMenus(q: string) {
    return apiFetch(`/api/menus?q=${encodeURIComponent(q)}`, MenusResponse);
  },

  searchBars(params: URLSearchParams) {
    return apiFetch(`/api/bars/search?${params}`, BarSearchResponse);
  },

  getTableRanking(code: string) {
    return apiFetch(`/api/tables?code=${code}`, TableRankingResponse);
  },

  getTableStats(code: string) {
    return apiFetch(`/api/tables?code=${encodeURIComponent(code)}&stats=1`, TableStatsResponse);
  },

  getTableStatsBySlug(slug: string) {
    return apiFetch(`/api/tables?slug=${encodeURIComponent(slug)}&stats=1`, TableStatsResponse);
  },

  createTable(slug: string) {
    return apiFetch("/api/tables", TableCreateResponse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  },

  joinTable(slug: string, code: string) {
    return apiFetch("/api/tables", TableCreateResponse, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, code }),
    });
  },

  rerollNickname(slug: string) {
    return apiFetch("/api/tables", RerollResponse, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
  },

  getMemberDrinks(tableCode: string, nickname: string) {
    return apiFetch(
      `/api/tables?code=${encodeURIComponent(tableCode)}&nickname=${encodeURIComponent(nickname)}`,
      MemberDrinksResponse
    );
  },

  leaveTable(slug: string) {
    return apiFetch(
      `/api/tables?slug=${encodeURIComponent(slug)}`,
      z.object({ ok: z.literal(true) }),
      {
        method: "DELETE",
      }
    );
  },

  async parseMenu(formData: FormData) {
    const res = await fetch("/api/parse-menu", { method: "POST", body: formData });
    if (!res.ok) return { items: [] as MenuItem[] };
    const data = await res.json();
    return ParseMenuResponse.parse(data);
  },
};
