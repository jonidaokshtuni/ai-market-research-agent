import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizationMembers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/organizations/active-workspace";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json().catch(() => null);

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      typeof (body as Record<string, unknown>).workspaceId !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid workspace ID is required." },
        { status: 400 }
      );
    }

    const workspaceId = (body as Record<string, unknown>).workspaceId as string;

    const [membership] = await db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, workspaceId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this workspace." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error("Failed to switch workspace:", error);

    return NextResponse.json(
      { error: "Unable to switch workspace." },
      { status: 500 }
    );
  }
}
