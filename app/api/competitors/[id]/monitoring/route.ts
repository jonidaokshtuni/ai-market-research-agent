import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { competitors, competitorMonitoring } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

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

async function getAuthorizedContext(id: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const workspace = await getActiveWorkspace(user.id);

  if (!workspace) {
    return { error: "No active workspace found", status: 403 as const };
  }

  const [competitor] = await db
    .select({ id: competitors.id })
    .from(competitors)
    .where(
      and(eq(competitors.id, id), eq(competitors.organizationId, workspace.id))
    )
    .limit(1);

  if (!competitor) {
    return { error: "Competitor not found", status: 404 as const };
  }

  return { user, workspace, competitor };
}

// GET: Retrieve shared monitoring configuration.
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const context = await getAuthorizedContext(id);

    if ("error" in context) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const [monitoring] = await db
      .select()
      .from(competitorMonitoring)
      .where(eq(competitorMonitoring.competitorId, id))
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

// PUT: Create or update shared monitoring configuration.
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const context = await getAuthorizedContext(id);

    if ("error" in context) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const { user } = context;

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
