import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardStats } from "@/lib/dashboard/queries";

async function DashboardContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const stats = await getDashboardStats(user.id);

  const cards = [
    {
      title: "Research Sessions",
      value: stats.totalSessions,
      description: "Total research sessions",
    },
    {
      title: "Reports Generated",
      value: stats.totalReports,
      description: "Reports created",
    },
    {
      title: "Sources Collected",
      value: stats.totalSources,
      description: "Sources gathered",
    },
    {
      title: "Research Activity",
      value: stats.activity.reduce((total, day) => total + day.total, 0),
      description: "Research requests in the last 30 days",
    },
  ];

  return (
    <div className="min-w-0 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-slate-400">
            Overview of your market research activity.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm font-medium text-slate-400">{card.title}</p>
              <p className="mt-4 text-3xl font-bold">
                {card.value.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-500">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Recent Research Activity</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your research activity over the last 30 days.
          </p>

          {stats.activity.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              No research activity yet. Start a research session to see your
              activity here.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {stats.activity.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between border-b border-slate-800 pb-3"
                >
                  <span className="text-sm text-slate-300">{day.date}</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {day.total} requests
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] animate-pulse rounded-2xl bg-slate-900" />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
