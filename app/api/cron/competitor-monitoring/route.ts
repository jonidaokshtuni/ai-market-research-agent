import { NextResponse } from "next/server";
import { and, asc, eq, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { competitors, competitorMonitoring } from "@/db/schema";
import { runAndSaveCompetitorResearch } from "@/lib/ai/services/competitor-research";

const BATCH_SIZE = 10;
const JOB_LEASE_MINUTES = 60;
const MAX_RETRY_MINUTES = 360;

function getNextRunAt(frequency: "daily" | "weekly") {
  const nextRunAt = new Date();

  if (frequency === "daily") {
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  } else {
    nextRunAt.setDate(nextRunAt.getDate() + 7);
  }

  return nextRunAt;
}

function getRetryDelay(failureCount: number) {
  return Math.min(15 * 2 ** Math.min(failureCount, 5), MAX_RETRY_MINUTES);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Competitor Monitoring Cron] CRON_SECRET is missing");

    return NextResponse.json(
      { error: "Cron endpoint is not configured" },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Fetch the competitor's workspace together with each due monitoring job.
    const dueJobs = await db
      .select({
        id: competitorMonitoring.id,
        competitorId: competitorMonitoring.competitorId,
        userId: competitorMonitoring.userId,
        organizationId: competitors.organizationId,
        frequency: competitorMonitoring.frequency,
        failureCount: competitorMonitoring.failureCount,
      })
      .from(competitorMonitoring)
      .innerJoin(
        competitors,
        eq(competitorMonitoring.competitorId, competitors.id)
      )
      .where(
        and(
          eq(competitorMonitoring.isEnabled, true),
          lte(competitorMonitoring.nextRunAt, now)
        )
      )
      .orderBy(asc(competitorMonitoring.nextRunAt))
      .limit(BATCH_SIZE);

    const results: {
      competitorId: string;
      status: "success" | "failed" | "skipped";
      message?: string;
    }[] = [];

    for (const job of dueJobs) {
      // A competitor without a workspace must not be researched by this worker.
      if (!job.organizationId) {
        await db
          .update(competitorMonitoring)
          .set({
            isEnabled: false,
            nextRunAt: null,
            lastError: "Monitoring disabled: competitor has no workspace",
            updatedAt: new Date(),
          })
          .where(eq(competitorMonitoring.id, job.id));

        results.push({
          competitorId: job.competitorId,
          status: "skipped",
          message: "Competitor is not assigned to a workspace",
        });

        continue;
      }

      // Atomically claim the job.
      const leaseUntil = new Date(Date.now() + JOB_LEASE_MINUTES * 60 * 1000);

      const [claimedJob] = await db
        .update(competitorMonitoring)
        .set({
          nextRunAt: leaseUntil,
          lastAttemptAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(competitorMonitoring.id, job.id),
            eq(competitorMonitoring.isEnabled, true),
            lte(competitorMonitoring.nextRunAt, now)
          )
        )
        .returning({
          id: competitorMonitoring.id,
        });

      if (!claimedJob) {
        results.push({
          competitorId: job.competitorId,
          status: "skipped",
          message: "Job was already claimed or disabled",
        });

        continue;
      }

      try {
        const snapshot = await runAndSaveCompetitorResearch({
          competitorId: job.competitorId,
          userId: job.userId,
          organizationId: job.organizationId,
        });

        if (!snapshot) {
          throw new Error("Competitor was not found in its workspace");
        }

        await db
          .update(competitorMonitoring)
          .set({
            lastRunAt: new Date(),
            lastAttemptAt: new Date(),
            nextRunAt: getNextRunAt(job.frequency),
            lastError: null,
            failureCount: 0,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(competitorMonitoring.id, job.id),
              eq(competitorMonitoring.isEnabled, true)
            )
          );

        results.push({
          competitorId: job.competitorId,
          status: "success",
          message: "Research completed and snapshot saved",
        });

        console.info(
          `[Competitor Monitoring Cron] Research completed: ${job.competitorId}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown research error";

        const retryMinutes = getRetryDelay(job.failureCount);
        const retryAt = new Date(Date.now() + retryMinutes * 60 * 1000);

        await db
          .update(competitorMonitoring)
          .set({
            nextRunAt: retryAt,
            lastError: errorMessage.slice(0, 2000),
            failureCount: sql`${competitorMonitoring.failureCount} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(competitorMonitoring.id, job.id),
              eq(competitorMonitoring.isEnabled, true)
            )
          );

        results.push({
          competitorId: job.competitorId,
          status: "failed",
          message: errorMessage,
        });

        console.error(
          `[Competitor Monitoring Cron] Research failed: ${job.competitorId}`,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      succeeded: results.filter((item) => item.status === "success").length,
      failed: results.filter((item) => item.status === "failed").length,
      skipped: results.filter((item) => item.status === "skipped").length,
      results,
    });
  } catch (error) {
    console.error("[Competitor Monitoring Cron] Worker failed:", error);

    return NextResponse.json(
      { error: "Failed to execute competitor monitoring worker" },
      { status: 500 }
    );
  }
}
