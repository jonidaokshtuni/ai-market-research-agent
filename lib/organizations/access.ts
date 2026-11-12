import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  organizationJoinRequests,
  organizationMembers,
  organizations,
  users,
} from "@/db/schema";

export type WorkspaceRole = "owner" | "admin" | "member";

export type UserWorkspace = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export type WorkspaceAdminRole = "owner" | "admin";

export type ManageableWorkspace = {
  id: string;
  name: string;
  role: WorkspaceAdminRole;
};

export type WorkspaceMember = {
  organizationId: string;
  organizationName: string;
  userId: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  joinedAt: Date;
};

export type WorkspaceJoinRequest = {
  id: string;
  status: typeof organizationJoinRequests.$inferSelect.status;
  createdAt: Date;
  workspaceName: string;
};

export async function getUserWorkspaces(
  userId: string
): Promise<UserWorkspace[]> {
  const memberships = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.name));

  return memberships.map((membership) => ({
    ...membership,
    role: membership.role as WorkspaceRole,
  }));
}

export async function getManageableWorkspaces(
  userId: string
): Promise<ManageableWorkspace[]> {
  const memberships = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        inArray(organizationMembers.role, ["owner", "admin"])
      )
    )
    .orderBy(asc(organizations.name));

  return memberships.map((membership) => ({
    ...membership,
    role: membership.role as WorkspaceAdminRole,
  }));
}

/**
 * Returns the latest workspace join request for a user.
 */
export async function getLatestWorkspaceJoinRequest(
  userId: string
): Promise<WorkspaceJoinRequest | null> {
  const [request] = await db
    .select({
      id: organizationJoinRequests.id,
      status: organizationJoinRequests.status,
      createdAt: organizationJoinRequests.createdAt,
      workspaceName: organizations.name,
    })
    .from(organizationJoinRequests)
    .innerJoin(
      organizations,
      eq(organizationJoinRequests.organizationId, organizations.id)
    )
    .where(eq(organizationJoinRequests.userId, userId))
    .orderBy(desc(organizationJoinRequests.createdAt))
    .limit(1);

  return request ?? null;
}

/**
 * Returns members only for workspaces the current user can administer.
 */
export async function getManageableWorkspaceMembers(
  userId: string
): Promise<WorkspaceMember[]> {
  const manageableWorkspaces = await getManageableWorkspaces(userId);
  const organizationIds = manageableWorkspaces.map((workspace) => workspace.id);

  if (organizationIds.length === 0) {
    return [];
  }

  const members = await db
    .select({
      organizationId: organizationMembers.organizationId,
      organizationName: organizations.name,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      joinedAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id)
    )
    .where(inArray(organizationMembers.organizationId, organizationIds))
    .orderBy(asc(organizations.name), asc(users.name), asc(users.email));

  return members.map((member) => ({
    ...member,
    role: member.role as WorkspaceRole,
  }));
}
