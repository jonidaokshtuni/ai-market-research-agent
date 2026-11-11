import { Suspense } from "react";
import { redirect } from "next/navigation";
import { desc, eq, and, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { messages, sessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type ReportData = {
  summary?: string;
  recommendation?: string;
};

async function ReportsContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const reports = await db
    .select({
      id: messages.id,
      content: messages.content,
      report: messages.report,
      createdAt: messages.createdAt,
      sessionTitle: sessions.title,
    })
    .from(messages)
    .innerJoin(sessions, eq(messages.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, user.id),
        eq(messages.role, "assistant"),
        isNotNull(messages.report)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Research Reports</h1>
        <p className="mt-2 text-slate-400">
          Browse your previously generated market research reports.
        </p>
      </div>

      <section className="space-y-4">
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
            <h2 className="text-lg font-semibold">No reports yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Generate your first market research report and it will appear
              here.
            </p>
          </div>
        ) : (
          reports.map((item) => {
            const report = item.report as ReportData | null;

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {item.sessionTitle}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.createdAt.toLocaleDateString("en", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                    Completed
                  </span>
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-300">
                  {report?.summary || item.content}
                </p>

                {report?.recommendation && (
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="text-sm font-semibold text-blue-400">
                      Recommendation
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {report.recommendation}
                    </p>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
