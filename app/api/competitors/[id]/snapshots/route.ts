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

    const limitValue = Number(rawLimit);
    const offsetValue = Number(rawOffset);

    if (
      !Number.isSafeInteger(limitValue) ||
      limitValue < 1 ||
      limitValue > MAX_LIMIT ||
      !Number.isSafeInteger(offsetValue) ||
      offsetValue < 0
    ) {
      return jsonResponse(
        {
          error: `Invalid pagination. Limit must be between 1 and ${MAX_LIMIT}, and offset must be a non-negative integer.`,
        },
        400
      );
    }

    const nextOffset = offsetValue + limitValue;

    if (!Number.isSafeInteger(nextOffset)) {
      return jsonResponse(
        { error: "Pagination offset exceeds the supported range." },
        400
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

    return jsonResponse({
      snapshots,
      pagination: {
        limit: limitValue,
        offset: offsetValue,
        hasMore,
        nextOffset: hasMore ? nextOffset : null,
      },
    });
  } catch (error) {
    console.error("GET competitor snapshots error:", error);

    return jsonResponse(
      { error: "Failed to fetch competitor research history" },
      500
    );
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
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

    const snapshot = await runAndSaveCompetitorResearch({
      competitorId: id,
      userId: user.id,
      organizationId: workspace.id,
    });

    if (!snapshot) {
      return jsonResponse({ error: "Competitor not found" }, 404);
    }

    return jsonResponse(
      {
        message: "Competitor research completed successfully",
        snapshot,
      },
      201
    );
  } catch (error) {
    console.error("POST competitor snapshot error:", error);

    return jsonResponse({ error: "Failed to run competitor research" }, 500);
  }
}
