import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import CompetitorManager from "@/components/dashboard/competitors/competitor-manager";

export default async function CompetitorsPage() {
  // Ensure this page is rendered with request-time data.
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
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

      {/* Main competitor management interface */}
      <CompetitorManager />
    </main>
  );
}
