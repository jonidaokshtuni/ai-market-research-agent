import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  organizations,
  organizationMembers,
  organizationJoinRequests,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Submit a request to join a workspace.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to request access." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const organizationId = body?.organizationId;

    if (
      typeof organizationId !== "string" ||
      !UUID_REGEX.test(organizationId)
    ) {
      return NextResponse.json(
        { error: "A valid workspace ID is required." },
        { status: 400 }
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

    const [membership] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .limit(1);

    if (membership) {
      return NextResponse.json(
        { error: "You are already a member of this workspace." },
        { status: 409 }
      );
    }

    const [joinRequest] = await db
      .insert(organizationJoinRequests)
      .values({
        organizationId,
        userId: user.id,
        status: "pending",
      })
      .returning({
        id: organizationJoinRequests.id,
        status: organizationJoinRequests.status,
        createdAt: organizationJoinRequests.createdAt,
      });

    return NextResponse.json(
      {
        message: "Your request to join the workspace has been submitted.",
        request: joinRequest,
        organization,
      },
      { status: 201 }
    );
  } catch (error) {
    const databaseError = error as { code?: string };

    if (databaseError.code === "23505") {
      return NextResponse.json(
        { error: "You already have a pending request for this workspace." },
        { status: 409 }
      );
    }

    console.error("Create workspace join request error:", error);

    return NextResponse.json(
      { error: "Failed to submit workspace join request." },
      { status: 500 }
    );
  }
}

// List pending requests. Only workspace owners and admins can access this.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId || !UUID_REGEX.test(organizationId)) {
      return NextResponse.json(
        { error: "A valid workspace ID is required." },
        { status: 400 }
      );
    }

    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .limit(1);

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "You do not have permission to view join requests." },
        { status: 403 }
      );
    }

    const requests = await db
      .select({
        id: organizationJoinRequests.id,
        status: organizationJoinRequests.status,
        createdAt: organizationJoinRequests.createdAt,
        requester: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(organizationJoinRequests)
      .innerJoin(users, eq(organizationJoinRequests.userId, users.id))
      .where(
        and(
          eq(organizationJoinRequests.organizationId, organizationId),
          eq(organizationJoinRequests.status, "pending")
        )
      )
      .orderBy(desc(organizationJoinRequests.createdAt));

    return NextResponse.json({
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error("List workspace join requests error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve workspace join requests." },
      { status: 500 }
    );
  }
}

// Approve or reject a pending workspace join request.
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    const requestId = body?.requestId;
    const action = body?.action;

    if (typeof requestId !== "string" || !UUID_REGEX.test(requestId)) {
      return NextResponse.json(
        { error: "A valid join request ID is required." },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be approve or reject." },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Authorization, request locking, membership creation and status
    // update are handled in one SQL statement.
    const result = await db.execute(sql`
      WITH authorized_actor AS MATERIALIZED (
        SELECT
          organization_members.organization_id,
          organization_members.user_id
        FROM organization_members
        WHERE organization_members.user_id = ${user.id}::uuid
          AND organization_members.role IN ('owner', 'admin')
      ),
      locked_request AS MATERIALIZED (
        SELECT
          join_request.id,
          join_request.organization_id,
          join_request.user_id
        FROM organization_join_requests AS join_request
        INNER JOIN authorized_actor
          ON authorized_actor.organization_id = join_request.organization_id
        WHERE join_request.id = ${requestId}::uuid
          AND join_request.status = 'pending'
        FOR UPDATE OF join_request
      ),
      created_membership AS (
        INSERT INTO organization_members (
          organization_id,
          user_id,
          role
        )
        SELECT
          organization_id,
          user_id,
          'member'
        FROM locked_request
        WHERE ${action} = 'approve'
        ON CONFLICT (organization_id, user_id) DO NOTHING
        RETURNING id
      ),
      updated_request AS (
        UPDATE organization_join_requests AS join_request
        SET
          status = ${newStatus},
          reviewed_by = ${user.id}::uuid,
          reviewed_at = NOW()
        FROM locked_request
        WHERE join_request.id = locked_request.id
          AND (SELECT COUNT(*) FROM created_membership) >= 0
        RETURNING
          join_request.id,
          join_request.organization_id,
          join_request.user_id,
          join_request.status,
          join_request.reviewed_at
      )
      SELECT
        updated_request.id,
        updated_request.organization_id AS "organizationId",
        updated_request.user_id AS "userId",
        updated_request.status,
        updated_request.reviewed_at AS "reviewedAt"
      FROM updated_request
    `);

    const updatedRequest = result.rows[0];

    if (!updatedRequest) {
      return NextResponse.json(
        {
          error:
            "Request not found, already processed, or you do not have permission to review it.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message:
        action === "approve"
          ? "Join request approved. The user is now a workspace member."
          : "Join request rejected.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Review workspace join request error:", error);

    return NextResponse.json(
      { error: "Failed to process workspace join request." },
      { status: 500 }
    );
  }
}
