import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { getResearchReports } from "@/lib/dashboard/queries";
import ReportsLibrary, {
  type ResearchReport,
} from "@/components/dashboard/reports-library";

async function ReportsContent() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const rows = await getResearchReports(user.id);

  // The report and sources columns are stored as JSON in the database.
  const reports: ResearchReport[] = rows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    sessionTitle: row.sessionTitle,
    report: row.report as ResearchReport["report"],
    sources: row.sources as ResearchReport["sources"],
    createdAt: row.createdAt,
  }));

  return (
    <div className="space-y-8 text-white">
      <div>
        <p className="text-sm font-medium text-indigo-400">
          MARKET INTELLIGENCE
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Research Reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Browse, search, and review your generated market research reports,
          including trends, SWOT analysis, strategic recommendations, and
          supporting sources.
        </p>
      </div>

      <ReportsLibrary reports={reports} />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-100 animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
