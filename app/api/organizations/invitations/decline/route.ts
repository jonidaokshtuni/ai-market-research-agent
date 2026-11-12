import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";

import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Please log in before declining an invitation." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const token = data.token;
    const invitationId = data.invitationId;

    const validToken =
      typeof token === "string" && /^[a-f0-9]{64}$/i.test(token);

    const validInvitationId =
      typeof invitationId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        invitationId
      );

    if (!validToken && !validInvitationId) {
      return NextResponse.json(
        { error: "A valid invitation token or invitation ID is required." },
        { status: 400 }
      );
    }

    const tokenHash = validToken ? hashToken(token) : null;
    const id = validInvitationId ? invitationId : null;

    const result = await db.execute(sql`
      UPDATE organization_invitations
      SET revoked_at = NOW()
      WHERE (
        (${tokenHash}::text IS NOT NULL AND token_hash = ${tokenHash})
        OR
        (${id}::text IS NOT NULL AND id::text = ${id})
      )
        AND LOWER(email) = LOWER(${currentUser.email})
        AND accepted_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > NOW()
      RETURNING id
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "This invitation is invalid, expired, already handled, or belongs to another email address.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "You have declined the workspace invitation." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Decline organization invitation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while declining the invitation." },
      { status: 500 }
    );
  }
}
