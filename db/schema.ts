import {
  pgTable,
  text,
  timestamp,
  jsonb,
  uuid,
  index,
  integer,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

// Competitor research snapshots
export const competitorSnapshots = pgTable(
  "competitor_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    competitorId: uuid("competitor_id")
      .references(() => competitors.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    researchTask: text("research_task").notNull(),

    summary: text("summary").notNull(),

    findings: jsonb("findings")
      .$type<
        {
          title: string;
          description: string;
          importance: "high" | "medium" | "low";
          sources: {
            title: string;
            url: string;
          }[];
        }[]
      >()
      .notNull(),

    keyInsights: jsonb("key_insights").$type<string[]>().notNull(),

    limitations: jsonb("limitations").$type<string[]>().notNull(),

    sources: jsonb("sources")
      .$type<
        {
          title: string;
          url: string;
        }[]
      >()
      .notNull(),

    toolsUsed: jsonb("tools_used").$type<string[]>().notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("competitor_snapshots_competitor_id_idx").on(table.competitorId),
    index("competitor_snapshots_user_id_idx").on(table.userId),
    index("competitor_snapshots_created_at_idx").on(table.createdAt),
  ]
);

export const competitorComparisons = pgTable(
  "competitor_comparisons",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    competitorId: uuid("competitor_id")
      .references(() => competitors.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    previousSnapshotId: uuid("previous_snapshot_id")
      .references(() => competitorSnapshots.id, { onDelete: "cascade" })
      .notNull(),

    currentSnapshotId: uuid("current_snapshot_id")
      .references(() => competitorSnapshots.id, { onDelete: "cascade" })
      .notNull(),

    summary: text("summary").notNull(),

    overallImpact: text("overall_impact")
      .$type<"high" | "medium" | "low" | "none">()
      .notNull(),

    changes: jsonb("changes")
      .$type<
        {
          category:
            | "product"
            | "pricing"
            | "positioning"
            | "strategy"
            | "strength"
            | "weakness"
            | "market";

          changeType: "new" | "changed" | "removed" | "strategic_shift";

          title: string;
          description: string;
          previousValue: string | null;
          currentValue: string | null;
          impact: "high" | "medium" | "low";
          confidence: "high" | "medium" | "low";
          sources: {
            title: string;
            url: string;
          }[];
        }[]
      >()
      .notNull(),

    limitations: jsonb("limitations").$type<string[]>().notNull(),

    sources: jsonb("sources")
      .$type<
        {
          title: string;
          url: string;
        }[]
      >()
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("competitor_comparisons_competitor_id_idx").on(table.competitorId),
    index("competitor_comparisons_user_id_idx").on(table.userId),
    index("competitor_comparisons_created_at_idx").on(table.createdAt),
    index("competitor_comparisons_previous_snapshot_id_idx").on(
      table.previousSnapshotId
    ),
    index("competitor_comparisons_current_snapshot_id_idx").on(
      table.currentSnapshotId
    ),
  ]
);

// Automatic competitor monitoring
export const competitorMonitoring = pgTable(
  "competitor_monitoring",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    competitorId: uuid("competitor_id")
      .references(() => competitors.id, { onDelete: "cascade" })
      .notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    isEnabled: boolean("is_enabled").default(false).notNull(),

    frequency: text("frequency")
      .$type<"daily" | "weekly">()
      .default("weekly")
      .notNull(),

    nextRunAt: timestamp("next_run_at"),

    lastRunAt: timestamp("last_run_at"),

    lastAttemptAt: timestamp("last_attempt_at"),

    lastError: text("last_error"),

    failureCount: integer("failure_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("competitor_monitoring_competitor_id_unique").on(
      table.competitorId
    ),

    index("competitor_monitoring_user_id_idx").on(table.userId),

    index("competitor_monitoring_due_idx").on(table.isEnabled, table.nextRunAt),
  ]
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("organizations_created_by_idx").on(table.createdBy)]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: text("role")
      .$type<"owner" | "admin" | "member">()
      .notNull()
      .default("member"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_unique").on(
      table.organizationId,
      table.userId
    ),
    index("organization_members_organization_id_idx").on(table.organizationId),
    index("organization_members_user_id_idx").on(table.userId),
  ]
);

// Organization invitations
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    email: text("email").notNull(),

    role: text("role").$type<"admin" | "member">().notNull().default("member"),

    tokenHash: text("token_hash").notNull().unique(),

    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    expiresAt: timestamp("expires_at").notNull(),

    acceptedAt: timestamp("accepted_at"),

    revokedAt: timestamp("revoked_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("organization_invitations_organization_id_idx").on(
      table.organizationId
    ),

    index("organization_invitations_email_idx").on(table.email),

    index("organization_invitations_expires_at_idx").on(table.expiresAt),
  ]
);

// Requests to join an organization
export const organizationJoinRequests = pgTable(
  "organization_join_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: text("status")
      .$type<"pending" | "approved" | "rejected">()
      .notNull()
      .default("pending"),

    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    reviewedAt: timestamp("reviewed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("organization_join_requests_organization_id_idx").on(
      table.organizationId
    ),

    index("organization_join_requests_user_id_idx").on(table.userId),

    index("organization_join_requests_status_idx").on(table.status),

    uniqueIndex("organization_join_requests_pending_unique")
      .on(table.organizationId, table.userId)
      .where(sql`${table.status} = 'pending'`),
  ]
);
