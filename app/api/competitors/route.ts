import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { competitors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

const CompetitorSchema = z.object({
  name: z.string().trim().min(1).max(150),
  website: z.string().trim().max(2048).optional().nullable(),
  industry: z.string().trim().max(150).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  products: z.string().trim().max(5000).optional().nullable(),
  pricing: z.string().trim().max(3000).optional().nullable(),
  strengths: z.string().trim().max(5000).optional().nullable(),
  weaknesses: z.string().trim().max(5000).optional().nullable(),
  marketStrength: z.number().int().min(0).max(100).optional(),
  innovationScore: z.number().int().min(0).max(100).optional(),
});

// GET: List all competitors in the active workspace.
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace" },
        { status: 403 }
      );
    }

    const results = await db
      .select()
      .from(competitors)
      .where(eq(competitors.organizationId, workspace.id))
      .orderBy(desc(competitors.createdAt));

    const competitorsWithPermissions = results.map((competitor) => ({
      ...competitor,
      canDelete: workspace.role !== "member" || competitor.userId === user.id,
    }));

    return NextResponse.json({
      competitors: competitorsWithPermissions,
    });
  } catch (error) {
    console.error("GET competitors error:", error);

    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

// POST: Create a competitor in the active workspace.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await getActiveWorkspace(user.id);

    if (!workspace) {
      return NextResponse.json(
        { error: "No active workspace" },
        { status: 403 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = CompetitorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid competitor data",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const [created] = await db
      .insert(competitors)
      .values({
        userId: user.id,
        organizationId: workspace.id,
        name: data.name,
        website: data.website || null,
        industry: data.industry || null,
        description: data.description || null,
        products: data.products || null,
        pricing: data.pricing || null,
        strengths: data.strengths || null,
        weaknesses: data.weaknesses || null,
        marketStrength: data.marketStrength ?? 50,
        innovationScore: data.innovationScore ?? 50,
      })
      .returning();

    return NextResponse.json({ competitor: created }, { status: 201 });
  } catch (error) {
    console.error("POST competitor error:", error);

    return NextResponse.json(
      { error: "Failed to create competitor" },
      { status: 500 }
    );
  }
}
