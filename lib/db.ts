import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import { pgTable, uuid, text, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export const barMenus = pgTable("bar_menus", {
  id: uuid("id").defaultRandom().primaryKey(),
  barName: text("bar_name").notNull(),
  items: jsonb("items").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  barMenuId: uuid("bar_menu_id").references(() => barMenus.id),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const db = drizzle(sql);
