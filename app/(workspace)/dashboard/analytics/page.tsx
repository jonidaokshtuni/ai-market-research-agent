import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getDashboardStats } from "@/lib/dashboard/queries";
import ResearchActivityChart from "@/components/dashboard/research-activity-chart";

async function AnalyticsContent() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const stats = await getDashboardStats(userId);

  const totalRequests = stats.activity.reduce(
    (total, day) => total + day.total,
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-2 text-slate-400">
          Understand your market research activity and performance.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Research Requests</p>
          <p className="mt-3 text-3xl font-bold">
            {totalRequests.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-slate-500">During the last 30 days</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm text-slate-400">Research Sessions</p>
          <p className="mt-3 text-3xl font-bold">
            {stats.totalSessions.toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            All your research sessions
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Research Activity</h2>
          <p className="mt-1 text-sm text-slate-400">
            Daily research requests over the last 30 days.
          </p>
        </div>

        <ResearchActivityChart data={stats.activity} />
      </section>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-100 animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
