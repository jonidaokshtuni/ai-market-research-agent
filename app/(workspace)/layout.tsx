import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { ShieldCheck, Sparkles } from "lucide-react";

import WorkspaceNav from "@/components/dashboard/workspace-nav";

async function WorkspaceHeader() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between border-b border-white/[0.06] bg-[#0c1322]/95 px-5 backdrop-blur-xl sm:px-8">
      <div>
        <p className="text-xs font-medium text-slate-500">
          MARKETINTEL / WORKSPACE
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-200">
          Market Research Dashboard
        </p>
      </div>

      <div>
        {userId ? (
          <UserButton />
        ) : (
          <Link
            href="/sign-in"
            className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080d19] text-white md:flex">
      <aside className="flex w-full shrink-0 flex-col border-b border-white/[0.06] bg-[#0c1322] p-5 md:sticky md:top-0 md:h-screen md:w-[270px] md:border-b-0 md:border-r">
        <Link href="/" className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-950/50">
            <Sparkles size={22} className="text-white" />
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Market<span className="text-indigo-400">Intel</span>
            </h2>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              Intelligence platform
            </p>
          </div>
        </Link>

        <WorkspaceNav />

        <div className="mt-8 hidden rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/10 to-blue-500/[0.03] p-4 md:block">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15">
            <Sparkles size={18} className="text-indigo-400" />
          </div>

          <h3 className="text-sm font-semibold text-white">
            AI Research Assistant
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Turn market data into actionable business intelligence.
          </p>

          <Link
            href="/dashboard/agent"
            className="mt-4 flex items-center justify-center rounded-lg bg-indigo-500/15 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/25"
          >
            Start researching →
          </Link>
        </div>

        <div className="mt-auto hidden border-t border-white/[0.06] pt-5 md:block">
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <ShieldCheck size={15} className="text-emerald-400" />
            Secure workspace
          </div>

          <p className="mt-2 px-2 text-[10px] text-slate-600">
            MarketIntel © 2026
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <Suspense
          fallback={
            <header className="min-h-[76px] border-b border-white/[0.06] bg-[#0c1322]" />
          }
        >
          <WorkspaceHeader />
        </Suspense>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
