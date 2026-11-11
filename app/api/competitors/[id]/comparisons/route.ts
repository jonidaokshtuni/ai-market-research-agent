import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { competitors, competitorComparisons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: RouteContext) {
  try {
    // Authenticate the request.
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate competitor ID.
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    // Verify that this competitor belongs to the current user.
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

    // Parse pagination parameters.
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

    // Retrieve comparison history.
    const results = await db
      .select()
      .from(competitorComparisons)
      .where(
        and(
          eq(competitorComparisons.competitorId, id),
          eq(competitorComparisons.userId, user.id)
        )
      )
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
