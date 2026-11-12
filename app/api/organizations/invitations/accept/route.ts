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
        { error: "Please log in before accepting an invitation." },
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

    // Accept the invitation and create membership atomically.
    const result = await db.execute(sql`
      WITH valid_invitation AS MATERIALIZED (
        SELECT
          id,
          organization_id,
          role
        FROM organization_invitations
        WHERE (
          (${tokenHash}::text IS NOT NULL AND token_hash = ${tokenHash})
          OR
          (${id}::text IS NOT NULL AND id::text = ${id})
        )
          AND LOWER(email) = LOWER(${currentUser.email})
          AND accepted_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > NOW()
        FOR UPDATE
      ),
      new_membership AS (
        INSERT INTO organization_members (
          organization_id,
          user_id,
          role
        )
        SELECT
          organization_id,
          ${currentUser.id}::uuid,
          role
        FROM valid_invitation
        ON CONFLICT (organization_id, user_id) DO NOTHING
        RETURNING id, organization_id
      ),
      accepted_invitation AS (
        UPDATE organization_invitations
        SET accepted_at = NOW()
        WHERE id IN (
          SELECT id FROM valid_invitation
        )
        AND EXISTS (
          SELECT 1 FROM new_membership
        )
        RETURNING id, organization_id
      )
      SELECT
        EXISTS (
          SELECT 1 FROM valid_invitation
        ) AS invitation_found,
        EXISTS (
          SELECT 1 FROM new_membership
        ) AS membership_added,
        EXISTS (
          SELECT 1 FROM accepted_invitation
        ) AS invitation_accepted,
        (
          SELECT organization_id
          FROM valid_invitation
          LIMIT 1
        ) AS organization_id
    `);

    const row = result.rows[0] as
      | {
          invitation_found: boolean;
          membership_added: boolean;
          invitation_accepted: boolean;
          organization_id: string | null;
        }
      | undefined;

    if (!row?.invitation_found) {
      return NextResponse.json(
        {
          error:
            "This invitation is invalid, expired, revoked, already used, or belongs to another email address.",
        },
        { status: 400 }
      );
    }

    if (!row.membership_added || !row.invitation_accepted) {
      return NextResponse.json(
        { error: "You are already a member of this workspace." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "You successfully joined the workspace.",
        organizationId: row.organization_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Accept organization invitation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while accepting the invitation." },
      { status: 500 }
    );
  }
}
