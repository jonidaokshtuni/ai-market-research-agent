import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { organizationInvitations, organizations } from "@/db/schema";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return NextResponse.json(
      { error: "Invalid or expired invitation." },
      { status: 400 }
    );
  }

  try {
    const now = new Date();

    const [invitation] = await db
      .select({
        id: organizationInvitations.id,
        email: organizationInvitations.email,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
        workspaceName: organizations.name,
      })
      .from(organizationInvitations)
      .innerJoin(
        organizations,
        eq(organizationInvitations.organizationId, organizations.id)
      )
      .where(
        and(
          eq(organizationInvitations.tokenHash, hashToken(token)),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, now)
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json(
        {
          error:
            "This invitation is invalid, expired, or has already been used.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          workspaceName: invitation.workspaceName,
          expiresAt: invitation.expiresAt,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Validate organization invitation error:", error);

    return NextResponse.json(
      { error: "Unable to validate this invitation." },
      { status: 500 }
    );
  }
}
