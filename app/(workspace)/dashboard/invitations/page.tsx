import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Mail } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import PendingInvitations from "@/components/dashboard/pending-invitations";

export default async function InvitationsPage() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
          <Mail className="h-6 w-6 text-indigo-400" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Workspace invitations
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Review invitations you&apos;ve received and choose which workspaces
            to join.
          </p>
        </div>
      </div>

      <PendingInvitations />
    </div>
  );
}
