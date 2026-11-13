import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { competitors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

const UpdateCompetitorSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    website: z.string().trim().max(2048).nullable(),
    industry: z.string().trim().max(150).nullable(),
    description: z.string().trim().max(5000).nullable(),
    products: z.string().trim().max(5000).nullable(),
    pricing: z.string().trim().max(3000).nullable(),
    strengths: z.string().trim().max(5000).nullable(),
    weaknesses: z.string().trim().max(5000).nullable(),
    marketStrength: z.number().int().min(0).max(100),
    innovationScore: z.number().int().min(0).max(100),
  })
  .partial();

const CompetitorIdSchema = z.string().uuid();

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAuthorizedContext() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const workspace = await getActiveWorkspace(user.id);

  if (!workspace) {
    return {
      error: NextResponse.json(
        { error: "No active workspace" },
        { status: 403 }
      ),
    };
  }

  return { user, workspace };
}

// PATCH: Update a competitor within the active workspace.
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await getAuthorizedContext();

    if ("error" in context) {
      return context.error;
    }

    const { workspace } = context;
    const { id } = await params;

    if (!CompetitorIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validation = UpdateCompetitorSchema.safeParse(body);

    if (
      !validation.success ||
      Object.keys(validation.data ?? {}).length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid or empty update data" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(competitors)
      .set({
        ...validation.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(competitors.id, id),
          eq(competitors.organizationId, workspace.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ competitor: updated });
  } catch (error) {
    console.error("PATCH competitor error:", error);

    return NextResponse.json(
      { error: "Failed to update competitor" },
      { status: 500 }
    );
  }
}

// DELETE: Members can delete their own competitors.
// Owners and admins can delete any competitor in their workspace.
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const context = await getAuthorizedContext();

    if ("error" in context) {
      return context.error;
    }

    const { user, workspace } = context;
    const { id } = await params;

    if (!CompetitorIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const conditions = [
      eq(competitors.id, id),
      eq(competitors.organizationId, workspace.id),
    ];

    if (workspace.role === "member") {
      conditions.push(eq(competitors.userId, user.id));
    }

    const [deleted] = await db
      .delete(competitors)
      .where(and(...conditions))
      .returning({ id: competitors.id });

    if (!deleted) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE competitor error:", error);

    return NextResponse.json(
      { error: "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
