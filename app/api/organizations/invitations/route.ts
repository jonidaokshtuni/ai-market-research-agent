import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

import { db } from "@/db";
import {
  organizationInvitations,
  organizationMembers,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const INVITATION_DURATION_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    // 1. Require authentication.
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 2. Validate request body.
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

    const organizationId =
      typeof data.organizationId === "string" ? data.organizationId.trim() : "";

    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    const role = data.role ?? "member";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        organizationId
      )
    ) {
      return NextResponse.json(
        { error: "A valid workspace ID is required." },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json(
        { error: "Invalid invitation role." },
        { status: 400 }
      );
    }

    // 3. Verify the authenticated user's workspace membership.
    const [membership] = await db
      .select({
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, currentUser.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this workspace." },
        { status: 403 }
      );
    }

    // 4. Enforce invitation permissions.
    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to invite members." },
        { status: 403 }
      );
    }

    // Admins can invite members, but only owners can invite admins.
    if (membership.role === "admin" && role === "admin") {
      return NextResponse.json(
        { error: "Only workspace owners can invite administrators." },
        { status: 403 }
      );
    }

    // 5. Prevent inviting someone who is already a workspace member.
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      const [existingMembership] = await db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, existingUser.id)
          )
        )
        .limit(1);

      if (existingMembership) {
        return NextResponse.json(
          { error: "This user is already a workspace member." },
          { status: 409 }
        );
      }
    }

    // 6. Prevent duplicate active invitations.
    const now = new Date();

    const [existingInvitation] = await db
      .select({ id: organizationInvitations.id })
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, organizationId),
          eq(organizationInvitations.email, email),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, now)
        )
      )
      .limit(1);

    if (existingInvitation) {
      return NextResponse.json(
        {
          error: "An active invitation already exists for this email address.",
        },
        { status: 409 }
      );
    }

    // 7. Generate a secure invitation token.
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() + INVITATION_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    // 8. Store only the token hash.
    const [invitation] = await db
      .insert(organizationInvitations)
      .values({
        organizationId,
        email,
        role,
        tokenHash,
        invitedBy: currentUser.id,
        expiresAt,
      })
      .returning({
        id: organizationInvitations.id,
        expiresAt: organizationInvitations.expiresAt,
      });

    // 9. Build the invitation URL.
    const appUrl = process.env.APP_URL || new URL(request.url).origin;
    const invitationUrl = new URL("/register", appUrl);

    invitationUrl.searchParams.set("invite", token);

    return NextResponse.json(
      {
        message: "Invitation created successfully.",
        invitation: {
          id: invitation.id,
          email,
          role,
          expiresAt: invitation.expiresAt,
          invitationUrl: invitationUrl.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create organization invitation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while creating the invitation." },
      { status: 500 }
    );
  }
}
