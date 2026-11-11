import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import AnalyticsDashboard from "@/components/dashboard/analytics-dashboard";

async function AnalyticsContent() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-2 text-slate-400">
          Understand your market research activity and performance.
        </p>
      </div>

      <AnalyticsDashboard />
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
