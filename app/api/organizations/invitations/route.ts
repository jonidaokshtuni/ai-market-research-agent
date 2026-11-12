import { NextResponse } from "next/server";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";

import { db } from "@/db";
import {
  organizationInvitations,
  organizationMembers,
  organizations,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const INVITATION_DURATION_DAYS = 7;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function revokeInvitation(invitationId: string) {
  try {
    await db
      .update(organizationInvitations)
      .set({ revokedAt: new Date() })
      .where(eq(organizationInvitations.id, invitationId));
  } catch (cleanupError) {
    console.error("Failed to revoke undelivered invitation:", cleanupError);
  }
}

/**
 * GET /api/organizations/invitations
 *
 * Returns pending invitations addressed to the authenticated user.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const invitations = await db
      .select({
        id: organizationInvitations.id,
        email: organizationInvitations.email,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        workspaceName: organizations.name,
        inviterName: users.name,
      })
      .from(organizationInvitations)
      .innerJoin(
        organizations,
        eq(organizationInvitations.organizationId, organizations.id)
      )
      .leftJoin(users, eq(organizationInvitations.invitedBy, users.id))
      .where(
        and(
          sql`LOWER(${organizationInvitations.email}) = LOWER(${currentUser.email})`,
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date())
        )
      )
      .orderBy(desc(organizationInvitations.createdAt));

    return NextResponse.json(
      { invitations },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Get pending organization invitations error:", error);

    return NextResponse.json(
      { error: "Something went wrong while loading invitations." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/invitations
 *
 * Creates and sends a workspace invitation.
 */
export async function POST(request: Request) {
  let invitationId: string | undefined;

  try {
    // 1. Require authentication.
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    // 2. Determine whether local email preview mode is enabled.
    // Preview mode is deliberately impossible in production.
    const isEmailPreview =
      process.env.NODE_ENV !== "production" &&
      process.env.EMAIL_PREVIEW === "true";

    // 3. Validate application URL.
    const appUrl = process.env.APP_URL?.trim();

    if (!appUrl) {
      console.error("APP_URL environment variable is missing.");

      return NextResponse.json(
        { error: "Invitation service is not configured." },
        { status: 500 }
      );
    }

    let parsedAppUrl: URL;

    try {
      parsedAppUrl = new URL(appUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid application URL configuration." },
        { status: 500 }
      );
    }

    if (
      parsedAppUrl.protocol !== "https:" &&
      parsedAppUrl.protocol !== "http:"
    ) {
      return NextResponse.json(
        { error: "Invalid application URL configuration." },
        { status: 500 }
      );
    }

    // 4. Validate email service configuration when not previewing.
    const apiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;

    if (!isEmailPreview && (!apiKey || !emailFrom)) {
      console.error("Invitation email environment variables are missing.");

      return NextResponse.json(
        { error: "Invitation email service is not configured." },
        { status: 500 }
      );
    }

    // 5. Validate request body.
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

    // 6. Verify workspace membership.
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

    // 7. Enforce invitation permissions.
    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to invite members." },
        { status: 403 }
      );
    }

    if (membership.role === "admin" && role === "admin") {
      return NextResponse.json(
        {
          error: "Only workspace owners can invite administrators.",
        },
        { status: 403 }
      );
    }

    // 8. Prevent inviting existing workspace members.
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

    // 9. Prevent duplicate active invitations.
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

    // 10. Load workspace and inviter details.
    const [organization] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, currentUser.id))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 }
      );
    }

    // 11. Generate a secure invitation token.
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() + INVITATION_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

    // Store only the token hash in the database.
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

    invitationId = invitation.id;

    // 12. Build the invitation URL.
    const invitationUrl = new URL("/register", parsedAppUrl);
    invitationUrl.searchParams.set("invite", token);

    const safeRole = role === "admin" ? "administrator" : "member";

    // 13. Local development preview: display the URL in the server terminal.
    if (isEmailPreview) {
      console.info(
        [
          "",
          "========== INVITATION EMAIL PREVIEW ==========",
          `To: ${email}`,
          `Workspace: ${organization.name}`,
          `Role: ${safeRole}`,
          `Invitation URL: ${invitationUrl.toString()}`,
          `Expires: ${expiresAt.toISOString()}`,
          "==============================================",
          "",
        ].join("\n")
      );

      return NextResponse.json(
        {
          message: `Development invitation created for ${email}. Check your terminal for the invitation link.`,
          invitation: {
            id: invitation.id,
            email,
            role,
            expiresAt: invitation.expiresAt,
          },
        },
        { status: 201 }
      );
    }

    // 14. Prepare the real invitation email.
    const workspaceName = escapeHtml(organization.name);
    const inviterName = escapeHtml(
      inviter?.name || "A workspace administrator"
    );

    const formattedExpiry = expiresAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailSubject = `You've been invited to join ${organization.name}`;

    const emailHtml = `
      <div style="background-color:#f4f4f5;padding:40px 16px;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:40px 32px;">
          <h1 style="font-size:24px;color:#18181b;margin:0 0 24px;">
            You're invited!
          </h1>

          <p style="font-size:15px;line-height:1.7;color:#3f3f46;">
            ${inviterName} has invited you to join
            <strong>${workspaceName}</strong>
            as a workspace ${safeRole}.
          </p>

          <p style="font-size:15px;line-height:1.7;color:#3f3f46;">
            Accept your invitation to get started with your workspace.
          </p>

          <div style="margin:32px 0;">
            <a
              href="${invitationUrl.toString()}"
              style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;"
            >
              Accept invitation
            </a>
          </div>

          <p style="font-size:13px;color:#71717a;line-height:1.6;">
            This invitation expires on ${formattedExpiry}.
          </p>

          <p style="font-size:13px;color:#71717a;line-height:1.6;">
            If you weren't expecting this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;

    const emailText = `
You're invited!

${inviter?.name || "A workspace administrator"} has invited you to join ${
      organization.name
    } as a workspace ${safeRole}.

Accept your invitation here:
${invitationUrl.toString()}

This invitation expires on ${formattedExpiry}.

If you weren't expecting this invitation, you can safely ignore this email.
    `.trim();

    // 15. Send the invitation email through Resend.
    try {
      const resend = new Resend(apiKey!);

      const { error: emailError } = await resend.emails.send({
        from: emailFrom!,
        to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      });

      if (emailError) {
        console.error("Resend invitation email error:", emailError);
        await revokeInvitation(invitation.id);

        return NextResponse.json(
          {
            error:
              "The invitation email could not be sent. Please try again later.",
          },
          { status: 502 }
        );
      }
    } catch (emailError) {
      console.error("Resend invitation email exception:", emailError);
      await revokeInvitation(invitation.id);

      return NextResponse.json(
        {
          error:
            "The invitation email could not be sent. Please try again later.",
        },
        { status: 502 }
      );
    }

    // 16. Return confirmation without exposing the invitation token.
    return NextResponse.json(
      {
        message: `Invitation email sent successfully to ${email}.`,
        invitation: {
          id: invitation.id,
          email,
          role,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create organization invitation error:", error);

    if (invitationId) {
      await revokeInvitation(invitationId);
    }

    return NextResponse.json(
      {
        error: "Something went wrong while creating the invitation.",
      },
      { status: 500 }
    );
  }
}
