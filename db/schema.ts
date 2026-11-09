import { pgTable, text, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  report: jsonb("report"),
  sources: jsonb("sources"),
  toolsUsed: jsonb("tools_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
