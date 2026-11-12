import { Suspense } from "react";
import { redirect } from "next/navigation";

import ResearchWorkspace from "@/components/agent/research-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

async function AgentContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  if (!activeWorkspace) {
    redirect("/dashboard");
  }

  return (
    <div className="min-w-0">
      <ResearchWorkspace
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        workspaceRole={activeWorkspace.role}
        userId={user.id}
      />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-100 animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <AgentContent />
    </Suspense>
  );
}
