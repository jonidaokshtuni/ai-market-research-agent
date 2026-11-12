import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { competitors, competitorComparisons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    if (!UUID_REGEX.test(id)) {
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

    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(searchParams.get("limit"));
    const requestedOffset = Number(searchParams.get("offset"));

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 50)
        : 20;

    const offset =
      Number.isInteger(requestedOffset) && requestedOffset >= 0
        ? requestedOffset
        : 0;

    const results = await db
      .select()
      .from(competitorComparisons)
      .where(eq(competitorComparisons.competitorId, id))
      .orderBy(
        desc(competitorComparisons.createdAt),
        desc(competitorComparisons.id)
      )
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    const comparisons = results.slice(0, limit);

    return NextResponse.json({
      comparisons,
      pagination: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? offset + limit : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/competitors/[id]/comparisons] Error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve competitor comparisons" },
      { status: 500 }
    );
  }
}
