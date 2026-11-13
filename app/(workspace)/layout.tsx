import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { LayoutDashboard } from "lucide-react";

import { db } from "@/db";
import { organizationInvitations, organizationJoinRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getUserWorkspaces } from "@/lib/organizations/access";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

import WorkspaceNav from "@/components/dashboard/workspace-nav";
import WorkspaceSwitcher from "@/components/dashboard/workspace-switcher";
import UserMenu from "@/components/dashboard/user-menu";
import InvitationPrompt from "@/components/dashboard/invitation-prompt";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

function WorkspaceLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading your workspace...</p>
    </div>
  );
}

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceContent>{children}</WorkspaceContent>
    </Suspense>
  );
}

async function WorkspaceContent({ children }: WorkspaceLayoutProps) {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspaces(user.id);

  let hasPendingInvitations = false;

  if (workspaces.length === 0) {
    const [pendingInvitation] = await db
      .select({
        id: organizationInvitations.id,
      })
      .from(organizationInvitations)
      .where(
        and(
          sql`LOWER(${organizationInvitations.email}) = LOWER(${user.email})`,
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date())
        )
      )
      .limit(1);

    hasPendingInvitations = Boolean(pendingInvitation);

    if (!hasPendingInvitations) {
      const [latestJoinRequest] = await db
        .select({
          status: organizationJoinRequests.status,
        })
        .from(organizationJoinRequests)
        .where(eq(organizationJoinRequests.userId, user.id))
        .orderBy(desc(organizationJoinRequests.createdAt))
        .limit(1);

      if (
        latestJoinRequest?.status === "pending" ||
        latestJoinRequest?.status === "rejected"
      ) {
        redirect("/pending-approval");
      }

      redirect("/register");
    }
  }

  const activeWorkspace = await getActiveWorkspace(user.id, workspaces);

  const canManageMembers =
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

  const displayName = user.name?.trim() || user.email;

  return (
    <div className="min-h-screen bg-background">
      <InvitationPrompt userEmail={user.email} />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.07] bg-card md:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950/30">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">
              Market Intelligence
            </p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
              RESEARCH PLATFORM
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <WorkspaceNav canManageMembers={canManageMembers} />
        </div>

        <div className="border-t border-white/[0.07] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Workspace platform
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Market research and insights
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b border-white/[0.07] bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              Market Intelligence
            </p>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Research and insights
            </p>
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            {activeWorkspace && (
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspaceId={activeWorkspace.id}
              />
            )}

            <UserMenu name={displayName} email={user.email} />
          </div>
        </header>

        {/* Mobile navigation */}
        <div className="border-b border-white/[0.07] bg-card md:hidden">
          <WorkspaceNav canManageMembers={canManageMembers} variant="mobile" />
        </div>

        <main className="min-h-[calc(100vh-8rem)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
