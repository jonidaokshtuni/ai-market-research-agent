import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { competitors, competitorComparisons } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return jsonResponse({ error: "No active workspace found" }, 403);
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return jsonResponse({ error: "Invalid competitor ID" }, 400);
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
      return jsonResponse({ error: "Competitor not found" }, 404);
    }

    const searchParams = new URL(request.url).searchParams;
    const rawLimit = searchParams.get("limit") ?? String(DEFAULT_LIMIT);
    const rawOffset = searchParams.get("offset") ?? "0";

    const limit = Number(rawLimit);
    const offset = Number(rawOffset);

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > MAX_LIMIT ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    ) {
      return jsonResponse(
        {
          error: `Invalid pagination. Limit must be between 1 and ${MAX_LIMIT}, and offset must be a non-negative integer.`,
        },
        400
      );
    }

    const nextOffset = offset + limit;

    if (!Number.isSafeInteger(nextOffset)) {
      return jsonResponse(
        { error: "Pagination offset exceeds the supported range." },
        400
      );
    }

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

    return jsonResponse({
      comparisons,
      pagination: {
        limit,
        offset,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/competitors/[id]/comparisons] Error:", error);

    return jsonResponse(
      { error: "Failed to retrieve competitor comparisons" },
      500
    );
  }
}
