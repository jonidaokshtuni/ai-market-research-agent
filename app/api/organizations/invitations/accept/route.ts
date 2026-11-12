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
    // 1. Require an authenticated user.
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Please log in before accepting an invitation." },
        { status: 401 }
      );
    }

    // 2. Validate the invitation token.
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

    const token = (body as Record<string, unknown>).token;

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { error: "A valid invitation token is required." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    // 3. Accept the invitation and create membership atomically.
    // The invitation row is locked to prevent concurrent acceptance.
    const result = await db.execute(sql`
      WITH valid_invitation AS MATERIALIZED (
        SELECT
          id,
          organization_id,
          role
        FROM organization_invitations
        WHERE token_hash = ${tokenHash}
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
        {
          error: "You are already a member of this workspace.",
        },
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
