import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";
import CompetitorManager from "@/components/dashboard/competitors/competitor-manager";

async function CompetitorsContent() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const activeWorkspace = await getActiveWorkspace(user.id);

  if (!activeWorkspace) {
    redirect("/");
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            MARKET INTELLIGENCE
          </span>

          <span className="text-xs text-slate-500">Competitive analysis</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Competitor Analysis
        </h1>

        <p className="max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Monitor competitors, evaluate market positioning, compare innovation
          capabilities and build your competitive intelligence database.
        </p>
      </header>

      <CompetitorManager key={activeWorkspace.id} />
    </main>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-100 animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <CompetitorsContent />
    </Suspense>
  );
}
