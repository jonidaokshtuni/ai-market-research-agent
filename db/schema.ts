import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Clerk user ID
    userId: text("user_id"),

    title: text("title").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

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
