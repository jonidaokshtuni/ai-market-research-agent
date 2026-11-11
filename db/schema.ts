import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
  integer,
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

// Competitor intelligence
export const competitors = pgTable(
  "competitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    name: text("name").notNull(),

    website: text("website"),

    industry: text("industry"),

    description: text("description"),

    products: text("products"),

    pricing: text("pricing"),

    strengths: text("strengths"),

    weaknesses: text("weaknesses"),

    marketStrength: integer("market_strength").default(50).notNull(),

    innovationScore: integer("innovation_score").default(50).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("competitors_user_id_idx").on(table.userId),
    index("competitors_created_at_idx").on(table.createdAt),
  ]
);
