import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";

import {
  getManageableWorkspaces,
  getManageableWorkspaceMembers,
} from "@/lib/organizations/access";
import { getCurrentUser } from "@/lib/auth";

import WorkspaceInvitationForm from "@/components/dashboard/workspace-invitation-form";
import WorkspaceJoinRequests from "@/components/dashboard/workspace-join-requests";
import WorkspaceMembersList from "@/components/dashboard/workspace-members-list";

export default async function WorkspaceMembersPage() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const manageableWorkspaces = await getManageableWorkspaces(user.id);

  if (manageableWorkspaces.length === 0) {
    redirect("/");
  }

  const members = await getManageableWorkspaceMembers(user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
          <ShieldCheck className="h-6 w-6 text-blue-400" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Workspace management
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage workspace members, invite new people, and review access
            requests.
          </p>
        </div>
      </div>

      <WorkspaceInvitationForm workspaces={manageableWorkspaces} />

      <WorkspaceMembersList
        workspaces={manageableWorkspaces}
        members={members}
      />

      <div className="border-t border-white/8 pt-8">
        <WorkspaceJoinRequests workspaces={manageableWorkspaces} />
      </div>
    </div>
  );
}
