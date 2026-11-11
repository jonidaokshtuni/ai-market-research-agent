import { Suspense } from "react";
import { redirect } from "next/navigation";
import ResearchWorkspace from "@/components/agent/research-workspace";
import { getCurrentUser } from "@/lib/auth";

async function AgentContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-w-0">
      <ResearchWorkspace />
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
