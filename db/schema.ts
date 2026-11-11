import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name"),

  email: text("email").notNull().unique(),

  passwordHash: text("password_hash").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Authentication sessions
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    tokenHash: text("token_hash").notNull().unique(),

    expiresAt: timestamp("expires_at").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)]
);
//market research sessions
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id"),

    title: text("title").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

// messages
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
