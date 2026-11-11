import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { competitors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH: Update a competitor
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
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
      .where(and(eq(competitors.id, id), eq(competitors.userId, user.id)))
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

// DELETE: Remove a competitor
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json(
        { error: "Invalid competitor ID" },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(competitors)
      .where(and(eq(competitors.id, id), eq(competitors.userId, user.id)))
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
