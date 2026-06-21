import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { pgTable, uuid, text, jsonb, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export type { MenuItem } from "./menu-items";
export { normalizeMenuItems } from "./menu-items";
import type { MenuItem } from "./menu-items";

export const barMenus = pgTable("bar_menus", {
  id: uuid("id").defaultRandom().primaryKey(),
  barName: text("bar_name").notNull(),
  items: jsonb("items").$type<MenuItem[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tables = pgTable("tables", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  barMenuId: uuid("bar_menu_id").references(() => barMenus.id, { onDelete: "set null" }),
  tableId: uuid("table_id").references(() => tables.id, { onDelete: "set null" }),
  nickname: varchar("nickname", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const drinks = pgTable("drinks", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  count: integer("count").notNull().default(1),
  category: text("category"),
  tappedAt: jsonb("tapped_at").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

let cachedDb: ReturnType<typeof drizzle> | null = null;

function getDb(): ReturnType<typeof drizzle> {
  if (!cachedDb) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL environment variable is required");
    }
    cachedDb = drizzle(neon(connectionString));
  }
  return cachedDb;
}

// Lazy proxy: the Neon client is created on first DB access (request time), never
// at module load / build time. This avoids instantiating a connection during
// `next build` (which triggers the @neondatabase/serverless websocket warning and
// would otherwise require POSTGRES_URL at build time).
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
