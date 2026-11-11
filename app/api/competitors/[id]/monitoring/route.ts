import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { competitors, competitorMonitoring } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidFrequency = (value: unknown): value is "daily" | "weekly" => {
  return value === "daily" || value === "weekly";
};

function getNextRunAt(frequency: "daily" | "weekly") {
  const nextRunAt = new Date();

  if (frequency === "daily") {
    nextRunAt.setDate(nextRunAt.getDate() + 1);
  } else {
    nextRunAt.setDate(nextRunAt.getDate() + 7);
  }

  return nextRunAt;
}

// GET: Retrieve monitoring configuration
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const [competitor] = await db
      .select({ id: competitors.id })
      .from(competitors)
      .where(and(eq(competitors.id, id), eq(competitors.userId, user.id)))
      .limit(1);

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const [monitoring] = await db
      .select()
      .from(competitorMonitoring)
      .where(
        and(
          eq(competitorMonitoring.competitorId, id),
          eq(competitorMonitoring.userId, user.id)
        )
      )
      .limit(1);

    return NextResponse.json({
      monitoring: monitoring ?? null,
    });
  } catch (error) {
    console.error("[GET /api/competitors/[id]/monitoring]", error);

    return NextResponse.json(
      { error: "Failed to retrieve monitoring settings" },
      { status: 500 }
    );
  }
}

// PUT: Create or update monitoring configuration
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const [competitor] = await db
      .select({ id: competitors.id })
      .from(competitors)
      .where(and(eq(competitors.id, id), eq(competitors.userId, user.id)))
      .limit(1);

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;

    const { isEnabled, frequency } = payload;

    if (typeof isEnabled !== "boolean") {
      return NextResponse.json(
        { error: "isEnabled must be a boolean" },
        { status: 400 }
      );
    }

    if (!isValidFrequency(frequency)) {
      return NextResponse.json(
        { error: "frequency must be daily or weekly" },
        { status: 400 }
      );
    }

    const now = new Date();

    const [monitoring] = await db
      .insert(competitorMonitoring)
      .values({
        competitorId: id,
        userId: user.id,
        isEnabled,
        frequency,
        nextRunAt: isEnabled ? getNextRunAt(frequency) : null,
        updatedAt: now,
        lastError: null,
        failureCount: 0,
      })
      .onConflictDoUpdate({
        target: competitorMonitoring.competitorId,
        set: {
          isEnabled,
          frequency,
          nextRunAt: isEnabled ? getNextRunAt(frequency) : null,
          updatedAt: now,
          lastError: null,
          failureCount: 0,
        },
      })
      .returning();

    return NextResponse.json({
      message: isEnabled
        ? "Competitor monitoring enabled"
        : "Competitor monitoring disabled",
      monitoring,
    });
  } catch (error) {
    console.error("[PUT /api/competitors/[id]/monitoring]", error);

    return NextResponse.json(
      { error: "Failed to update monitoring settings" },
      { status: 500 }
    );
  }
}
