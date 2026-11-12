import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";

import { db } from "@/db";
import { hashPassword, createSession } from "@/lib/auth";

type RegistrationMode = "create" | "join" | "request";

type CreatedAccount = {
  user_id: string;
  user_name: string | null;
  user_email: string;
  organization_id: string;
  organization_name: string;
  role: "owner" | "admin" | "member" | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
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

    const name = typeof data.name === "string" ? data.name.trim() : "";
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data.password === "string" ? data.password : "";

    const mode: RegistrationMode | null =
      data.mode === "create" || data.mode === "join" || data.mode === "request"
        ? data.mode
        : null;

    const workspaceName =
      typeof data.workspaceName === "string" ? data.workspaceName.trim() : "";

    const inviteToken =
      typeof data.inviteToken === "string" ? data.inviteToken.trim() : "";

    const organizationId =
      typeof data.organizationId === "string" ? data.organizationId.trim() : "";

    if (!mode || !name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, password and registration mode are required." },
        { status: 400 }
      );
    }

    if (name.length > 100 || email.length > 254) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 128) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and no more than 128 bytes.",
        },
        { status: 400 }
      );
    }

    if (mode === "create" && (!workspaceName || workspaceName.length > 100)) {
      return NextResponse.json(
        { error: "A workspace name of up to 100 characters is required." },
        { status: 400 }
      );
    }

    if (mode === "join" && !/^[a-f0-9]{64}$/i.test(inviteToken)) {
      return NextResponse.json(
        { error: "A valid invitation link is required." },
        { status: 400 }
      );
    }

    if (mode === "request" && !UUID_REGEX.test(organizationId)) {
      return NextResponse.json(
        { error: "Please select a valid workspace." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    let created: CreatedAccount | undefined;

    if (mode === "create") {
      // Create user, workspace and owner membership atomically.
      const result = await db.execute(sql`
        WITH new_user AS (
          INSERT INTO users (name, email, password_hash)
          VALUES (${name}, ${email}, ${passwordHash})
          RETURNING id, name, email
        ),
        new_organization AS (
          INSERT INTO organizations (name, created_by)
          SELECT ${workspaceName}, id
          FROM new_user
          RETURNING id, name, created_by
        ),
        new_membership AS (
          INSERT INTO organization_members (
            organization_id,
            user_id,
            role
          )
          SELECT id, created_by, 'owner'
          FROM new_organization
          RETURNING organization_id, user_id, role
        )
        SELECT
          new_user.id AS user_id,
          new_user.name AS user_name,
          new_user.email AS user_email,
          new_organization.id AS organization_id,
          new_organization.name AS organization_name,
          new_membership.role AS role
        FROM new_user
        CROSS JOIN new_organization
        CROSS JOIN new_membership
      `);

      created = result.rows[0] as CreatedAccount | undefined;
    } else if (mode === "join") {
      // Hash the invitation token. The raw token is never stored.
      const tokenHash = createHash("sha256").update(inviteToken).digest("hex");

      // Create user, membership and accept invitation atomically.
      const result = await db.execute(sql`
        WITH valid_invitation AS MATERIALIZED (
          SELECT
            invitation.id,
            invitation.organization_id,
            invitation.role,
            organization.name AS organization_name
          FROM organization_invitations AS invitation
          INNER JOIN organizations AS organization
            ON organization.id = invitation.organization_id
          WHERE invitation.token_hash = ${tokenHash}
            AND LOWER(invitation.email) = ${email}
            AND invitation.accepted_at IS NULL
            AND invitation.revoked_at IS NULL
            AND invitation.expires_at > NOW()
          FOR UPDATE OF invitation
        ),
        new_user AS (
          INSERT INTO users (name, email, password_hash)
          SELECT ${name}, ${email}, ${passwordHash}
          WHERE EXISTS (SELECT 1 FROM valid_invitation)
          RETURNING id, name, email
        ),
        new_membership AS (
          INSERT INTO organization_members (
            organization_id,
            user_id,
            role
          )
          SELECT
            invitation.organization_id,
            new_user.id,
            invitation.role
          FROM valid_invitation AS invitation
          CROSS JOIN new_user
          RETURNING organization_id, user_id, role
        ),
        accepted_invitation AS (
          UPDATE organization_invitations AS invitation
          SET accepted_at = NOW()
          FROM valid_invitation AS valid
          WHERE invitation.id = valid.id
            AND EXISTS (SELECT 1 FROM new_membership)
          RETURNING invitation.id
        )
        SELECT
          new_user.id AS user_id,
          new_user.name AS user_name,
          new_user.email AS user_email,
          valid_invitation.organization_id AS organization_id,
          valid_invitation.organization_name AS organization_name,
          new_membership.role AS role
        FROM new_user
        CROSS JOIN valid_invitation
        CROSS JOIN new_membership
        CROSS JOIN accepted_invitation
      `);

      created = result.rows[0] as CreatedAccount | undefined;

      if (!created) {
        return NextResponse.json(
          {
            error:
              "This invitation is invalid, expired, revoked, already used, or does not match your email address.",
          },
          { status: 400 }
        );
      }
    } else {
      // Create the account and pending join request atomically.
      // No workspace membership is granted at this stage.
      const result = await db.execute(sql`
        WITH target_organization AS MATERIALIZED (
          SELECT id, name
          FROM organizations
          WHERE id = ${organizationId}::uuid
        ),
        new_user AS (
          INSERT INTO users (name, email, password_hash)
          SELECT ${name}, ${email}, ${passwordHash}
          WHERE EXISTS (SELECT 1 FROM target_organization)
          RETURNING id, name, email
        ),
        new_join_request AS (
          INSERT INTO organization_join_requests (
            organization_id,
            user_id,
            status
          )
          SELECT
            target_organization.id,
            new_user.id,
            'pending'
          FROM target_organization
          CROSS JOIN new_user
          RETURNING organization_id, user_id
        )
        SELECT
          new_user.id AS user_id,
          new_user.name AS user_name,
          new_user.email AS user_email,
          target_organization.id AS organization_id,
          target_organization.name AS organization_name,
          NULL::text AS role
        FROM new_user
        CROSS JOIN target_organization
        CROSS JOIN new_join_request
      `);

      created = result.rows[0] as CreatedAccount | undefined;

      if (!created) {
        return NextResponse.json(
          { error: "The selected workspace could not be found." },
          { status: 404 }
        );
      }
    }

    if (!created) {
      throw new Error("Account registration failed.");
    }

    await createSession(created.user_id);

    return NextResponse.json(
      {
        message:
          mode === "join"
            ? "Account created and workspace joined successfully."
            : mode === "request"
            ? "Account created. Your workspace access request is pending approval."
            : "Account and workspace created successfully.",
        user: {
          id: created.user_id,
          name: created.user_name,
          email: created.user_email,
        },
        organization: {
          id: created.organization_id,
          name: created.organization_name,
          role: created.role,
        },
        pendingApproval: mode === "request",
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating your account." },
      { status: 500 }
    );
  }
}
