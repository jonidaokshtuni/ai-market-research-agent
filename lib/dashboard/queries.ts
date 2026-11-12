import "server-only";

import { and, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { messages, sessions } from "@/db/schema";

export async function getDashboardStats(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [sessionStats] = await db
    .select({
      total: count(),
    })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const [reportStats] = await db
    .select({
      total: count(),
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), isNotNull(messages.report)));

  const [sourceStats] = await db
    .select({
      total: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN jsonb_typeof(${messages.sources}) = 'array'
              THEN jsonb_array_length(${messages.sources})
              ELSE 0
            END
          ),
          0
        )::int
      `,
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), eq(messages.role, "assistant")));

  const activity = await db
    .select({
      date: sql<string>`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`,
      total: count(),
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        eq(messages.role, "user"),
        gte(messages.createdAt, thirtyDaysAgo)
      )
    )
    .groupBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`);

  return {
    totalSessions: sessionStats.total,
    totalReports: reportStats.total,
    totalSources: sourceStats.total,
    activity,
  };
}

export async function getResearchHistory(userId: string) {
  const rows = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      createdAt: sessions.createdAt,
      messageCount: sql<number>`count(${messages.id})::int`,
      reportCount: sql<number>`
        count(${messages.id})
        filter (where ${messages.report} is not null)::int
      `,
      lastActivity: sql<Date>`max(${messages.createdAt})`,
    })
    .from(sessions)
    .leftJoin(messages, eq(messages.sessionId, sessions.id))
    .where(eq(sessions.userId, userId))
    .groupBy(sessions.id, sessions.title, sessions.createdAt)
    .orderBy(sql`max(${messages.createdAt}) desc nulls last`);

  return rows;
}

export async function getAnalyticsData(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const endExclusive = new Date(endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const activity = await db
    .select({
      date: sql<string>`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`,
      requests: sql<number>`
        COUNT(${messages.id})
        FILTER (WHERE ${messages.role} = 'user')::int
      `,
      reports: sql<number>`
        COUNT(${messages.id})
        FILTER (WHERE ${messages.report} IS NOT NULL)::int
      `,
      sources: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${messages.role} = 'assistant'
                AND jsonb_typeof(${messages.sources}) = 'array'
              THEN jsonb_array_length(${messages.sources})
              ELSE 0
            END
          ),
          0
        )::int
      `,
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        gte(messages.createdAt, startDate),
        lt(messages.createdAt, endExclusive)
      )
    )
    .groupBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`TO_CHAR(${messages.createdAt}, 'YYYY-MM-DD')`);

  const [sessionStats] = await db
    .select({
      total: sql<number>`COUNT(DISTINCT ${sessions.id})::int`,
    })
    .from(sessions)
    .innerJoin(messages, eq(messages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        gte(messages.createdAt, startDate),
        lt(messages.createdAt, endExclusive)
      )
    );

  const totals = activity.reduce(
    (result, day) => ({
      requests: result.requests + day.requests,
      reports: result.reports + day.reports,
      sources: result.sources + day.sources,
    }),
    { requests: 0, reports: 0, sources: 0 }
  );

  return {
    activity,
    totals: {
      ...totals,
      sessions: sessionStats.total,
    },
  };
}

export async function getResearchReports(userId: string) {
  return db
    .select({
      id: messages.id,
      sessionId: sessions.id,
      sessionTitle: sessions.title,
      report: messages.report,
      sources: messages.sources,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), isNotNull(messages.report)))
    .orderBy(desc(messages.createdAt));
}
