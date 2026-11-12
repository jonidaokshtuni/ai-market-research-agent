import { NextResponse } from "next/server";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import nodemailer from "nodemailer";

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
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

async function revokeInvitation(invitationId: string) {
  await db
    .update(organizationInvitations)
    .set({ revokedAt: new Date() })
    .where(eq(organizationInvitations.id, invitationId));
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const organizationId = searchParams.get("organizationId");
    const email = searchParams.get("email")?.trim().toLowerCase();

    // Check whether a specific workspace/email has an active invitation.
    if (organizationId || email) {
      if (
        !organizationId ||
        !email ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          organizationId
        ) ||
        email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        return NextResponse.json(
          { error: "Invalid invitation lookup parameters." },
          { status: 400 }
        );
      }

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

      if (
        !membership ||
        (membership.role !== "owner" && membership.role !== "admin")
      ) {
        return NextResponse.json(
          { error: "You do not have permission to check invitations." },
          { status: 403 }
        );
      }

      const [activeInvitation] = await db
        .select({
          expiresAt: organizationInvitations.expiresAt,
        })
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.organizationId, organizationId),
            eq(sql`lower(${organizationInvitations.email})`, email),
            isNull(organizationInvitations.acceptedAt),
            isNull(organizationInvitations.revokedAt),
            gt(organizationInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      return NextResponse.json(
        {
          activeInvitation: activeInvitation ?? null,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Preserve the existing behavior: fetch invitations for the current user.
    const invitations = await db
      .select({
        id: organizationInvitations.id,
        email: organizationInvitations.email,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        acceptedAt: organizationInvitations.acceptedAt,
        revokedAt: organizationInvitations.revokedAt,
        organizationId: organizationInvitations.organizationId,
        organizationName: organizations.name,
        invitedByName: users.name,
      })
      .from(organizationInvitations)
      .innerJoin(
        organizations,
        eq(organizationInvitations.organizationId, organizations.id)
      )
      .leftJoin(users, eq(organizationInvitations.invitedBy, users.id))
      .where(
        and(
          eq(
            sql`lower(${organizationInvitations.email})`,
            currentUser.email.toLowerCase()
          ),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date())
        )
      )
      .orderBy(desc(organizationInvitations.createdAt));

    return NextResponse.json(
      { invitations },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch workspace invitations:", error);

    return NextResponse.json(
      { error: "Unable to fetch invitations." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let createdInvitationId: string | null = null;
  let emailDeliveryFailed = false;

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Validate application URL.
    const appUrl = process.env.APP_URL;

    if (!appUrl) {
      console.error("APP_URL environment variable is missing.");

      return NextResponse.json(
        { error: "Application URL is not configured." },
        { status: 500 }
      );
    }

    let parsedAppUrl: URL;

    try {
      parsedAppUrl = new URL(appUrl);
    } catch {
      console.error("APP_URL environment variable is invalid.");

      return NextResponse.json(
        { error: "Application URL is not configured correctly." },
        { status: 500 }
      );
    }

    if (
      parsedAppUrl.protocol !== "https:" &&
      parsedAppUrl.hostname !== "localhost"
    ) {
      return NextResponse.json(
        { error: "Application URL must use HTTPS." },
        { status: 500 }
      );
    }

    // Validate Gmail SMTP configuration before creating an invitation.
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT ?? "465");
    const smtpSecure = process.env.SMTP_SECURE === "true";
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const emailFrom = process.env.EMAIL_FROM;

    if (
      !smtpHost ||
      !Number.isInteger(smtpPort) ||
      smtpPort < 1 ||
      smtpPort > 65535 ||
      !smtpSecure ||
      !smtpUser ||
      !smtpPassword ||
      !emailFrom
    ) {
      console.error("Gmail SMTP environment variables are missing or invalid.");

      return NextResponse.json(
        { error: "Email service is not configured correctly." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const organizationId =
      typeof body.organizationId === "string" ? body.organizationId : "";

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const role = body.role === "admin" ? "admin" : "member";

    if (
      !organizationId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        organizationId
      )
    ) {
      return NextResponse.json(
        { error: "Please select a valid workspace." },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Verify workspace membership and permissions.
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

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to invite members." },
        { status: 403 }
      );
    }

    if (role === "admin" && membership.role !== "owner") {
      return NextResponse.json(
        {
          error: "Only workspace owners can invite administrators.",
        },
        { status: 403 }
      );
    }

    // Prevent inviting someone who is already a workspace member.
    const [existingUser] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    if (existingUser) {
      const [existingMembership] = await db
        .select({
          id: organizationMembers.id,
        })
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
          {
            error: "This user is already a member of the workspace.",
          },
          { status: 409 }
        );
      }
    }

    // Prevent duplicate active invitations.
    const [existingInvitation] = await db
      .select({
        id: organizationInvitations.id,
      })
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, organizationId),
          eq(sql`lower(${organizationInvitations.email})`, email),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date())
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

    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { error: "Workspace not found." },
        { status: 404 }
      );
    }

    // Generate a cryptographically secure invitation token.
    const token = randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() + INVITATION_DURATION_DAYS * 24 * 60 * 60 * 1000
    );

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
        email: organizationInvitations.email,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
      });

    if (!invitation) {
      throw new Error("Failed to create workspace invitation.");
    }

    createdInvitationId = invitation.id;

    // Build the registration URL.
    const invitationUrl = new URL("/register", parsedAppUrl);
    invitationUrl.searchParams.set("invite", token);

    const safeOrganizationName = escapeHtml(organization.name);
    const safeEmail = escapeHtml(email);
    const safeInvitationUrl = escapeHtml(invitationUrl.toString());
    const safeRole = escapeHtml(role);
    const expirationDate = expiresAt.toUTCString();

    // Create a Gmail SMTP transporter.
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    });

    // Send the invitation email.
    try {
      await transporter.sendMail({
        from: emailFrom,
        to: email,
        subject: `You're invited to join ${organization.name} on AI Market Agent`,
        text: [
          `You've been invited to join ${organization.name} on AI Market Agent.`,
          "",
          `Invitation role: ${role}`,
          "",
          "Accept your invitation using this link:",
          invitationUrl.toString(),
          "",
          `This invitation expires on ${expirationDate}.`,
          "",
          "If you weren't expecting this invitation, you can ignore this email.",
        ].join("\n"),
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Workspace invitation</title>
            </head>
            <body style="margin:0;padding:32px 16px;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
              <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:16px;padding:36px 28px;">
                <h1 style="margin:0 0 16px;font-size:25px;color:#0f172a;">
                  You're invited!
                </h1>

                <p style="font-size:15px;line-height:1.7;color:#475569;">
                  You've been invited to join
                  <strong>${safeOrganizationName}</strong>
                  on AI Market Agent.
                </p>

                <p style="font-size:14px;line-height:1.7;color:#475569;">
                  Your workspace role:
                  <strong>${safeRole}</strong>
                </p>

                <div style="margin:28px 0;text-align:center;">
                  <a
                    href="${safeInvitationUrl}"
                    style="display:inline-block;padding:14px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:bold;"
                  >
                    Accept invitation
                  </a>
                </div>

                <p style="font-size:13px;line-height:1.7;color:#64748b;">
                  This invitation was sent to ${safeEmail} and expires on
                  ${expirationDate}.
                </p>

                <p style="font-size:13px;line-height:1.7;color:#64748b;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>

                <p style="font-size:12px;line-height:1.6;word-break:break-all;">
                  <a href="${safeInvitationUrl}" style="color:#2563eb;">
                    ${safeInvitationUrl}
                  </a>
                </p>

                <hr style="margin:28px 0;border:0;border-top:1px solid #e2e8f0;" />

                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError) {
      emailDeliveryFailed = true;
      throw emailError;
    }

    return NextResponse.json(
      {
        message: `Invitation email sent to ${email}.`,
        invitationUrl: invitationUrl.toString(),
        invitation: {
          id: invitation.id,
          email,
          role,
          expiresAt: invitation.expiresAt,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (createdInvitationId) {
      try {
        await revokeInvitation(createdInvitationId);
      } catch (revokeError) {
        console.error(
          "Failed to revoke invitation after an error:",
          revokeError
        );
      }
    }

    if (emailDeliveryFailed) {
      console.error("Workspace invitation email delivery failed:", error);

      return NextResponse.json(
        {
          error:
            "The invitation was created but the email could not be sent. Please check your email configuration and try again.",
        },
        { status: 502 }
      );
    }

    console.error("Failed to create workspace invitation:", error);

    return NextResponse.json(
      { error: "Unable to create the invitation." },
      { status: 500 }
    );
  }
}
