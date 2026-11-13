import "server-only";

import { cookies } from "next/headers";

import {
  getUserWorkspaces,
  type UserWorkspace,
} from "@/lib/organizations/access";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

export async function getActiveWorkspace(
  userId: string,
  availableWorkspaces?: UserWorkspace[]
): Promise<UserWorkspace | null> {
  const workspaces = availableWorkspaces ?? (await getUserWorkspaces(userId));

  if (workspaces.length === 0) {
    return null;
  }

  const cookieStore = await cookies();
  const requestedWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  return (
    workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ??
    workspaces[0]
  );
}
