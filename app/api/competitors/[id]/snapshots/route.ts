import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { competitors, competitorSnapshots } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";
import { runAndSaveCompetitorResearch } from "@/lib/ai/services/competitor-research";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const [competitor] = await db
      .select({ id: competitors.id })
      .from(competitors)
      .where(
        and(
          eq(competitors.id, id),
          eq(competitors.organizationId, workspace.id)
        )
      )
      .limit(1);

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const rawLimit = searchParams.get("limit") ?? String(DEFAULT_LIMIT);
    const rawOffset = searchParams.get("offset") ?? "0";

    const limitValue = Number(rawLimit);
    const offsetValue = Number(rawOffset);

    if (
      !Number.isSafeInteger(limitValue) ||
      limitValue < 1 ||
      limitValue > MAX_LIMIT ||
      !Number.isSafeInteger(offsetValue) ||
      offsetValue < 0
    ) {
      return NextResponse.json(
        {
          error: `Invalid pagination. Limit must be between 1 and ${MAX_LIMIT}, and offset must be a non-negative integer.`,
        },
        { status: 400 }
      );
    }

    const results = await db
      .select()
      .from(competitorSnapshots)
      .where(eq(competitorSnapshots.competitorId, id))
      .orderBy(
        desc(competitorSnapshots.createdAt),
        desc(competitorSnapshots.id)
      )
      .limit(limitValue + 1)
      .offset(offsetValue);

    const hasMore = results.length > limitValue;
    const snapshots = results.slice(0, limitValue);

    return NextResponse.json({
      snapshots,
      pagination: {
        limit: limitValue,
        offset: offsetValue,
        hasMore,
        nextOffset: hasMore ? offsetValue + limitValue : null,
      },
    });
  } catch (error) {
    console.error("GET competitor snapshots error:", error);

    return NextResponse.json(
      { error: "Failed to fetch competitor research history" },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace found" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const snapshot = await runAndSaveCompetitorResearch({
      competitorId: id,
      userId: user.id,
      organizationId: workspace.id,
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Competitor research completed successfully",
        snapshot,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST competitor snapshot error:", error);

    return NextResponse.json(
      { error: "Failed to run competitor research" },
      { status: 500 }
    );
  }
}
