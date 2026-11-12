import { and, eq } from "drizzle-orm";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { db } from "@/db";
import { competitors } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getActiveWorkspace } from "@/lib/organizations/active-workspace";

import CompetitorResearchPanel from "@/components/dashboard/competitors/competitor-research-panel";

type CompetitorProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

function ScoreCard({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: "blue" | "violet";
}) {
  const safeScore = Math.min(100, Math.max(0, score));

  const barColor = color === "blue" ? "bg-blue-500" : "bg-violet-500";

  const textColor = color === "blue" ? "text-blue-400" : "text-violet-400";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-400">{label}</p>

        <p className={`text-2xl font-bold tabular-nums ${textColor}`}>
          {safeScore}
          <span className="text-sm text-slate-500">/100</span>
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuenow={safeScore}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  content,
  color = "default",
}: {
  title: string;
  content: string | null;
  color?: "default" | "emerald" | "rose";
}) {
  const styles = {
    default: "border-slate-800 bg-slate-950/70",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    rose: "border-rose-500/20 bg-rose-500/5",
  };

  const headingStyles = {
    default: "text-slate-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400",
  };

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${styles[color]}`}>
      <h2
        className={`mb-3 text-sm font-semibold uppercase tracking-wider ${headingStyles[color]}`}
      >
        {title}
      </h2>

      {content?.trim() ? (
        <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-300">
          {content}
        </p>
      ) : (
        <p className="text-sm italic text-slate-600">
          No information available yet.
        </p>
      )}
    </section>
  );
}

export default async function CompetitorProfilePage({
  params,
}: CompetitorProfilePageProps) {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  // Validate the ID before querying PostgreSQL.
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Resolve the active workspace and verify competitor access.
  const workspace = await getActiveWorkspace(user.id);

  if (!workspace) {
    notFound();
  }

  const [competitor] = await db
    .select()
    .from(competitors)
    .where(
      and(eq(competitors.id, id), eq(competitors.organizationId, workspace.id))
    )
    .limit(1);

  if (!competitor) {
    notFound();
  }

  const createdDate = competitor.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const updatedDate = competitor.updatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Navigation */}
      <Link
        href="/dashboard/competitors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
      >
        <span aria-hidden="true">←</span>
        Back to competitors
      </Link>

      {/* Profile header */}
      <header className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-2xl font-bold text-blue-400">
              {competitor.name.trim().charAt(0).toUpperCase() || "?"}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                  COMPETITOR PROFILE
                </span>

                {competitor.industry && (
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                    {competitor.industry}
                  </span>
                )}
              </div>

              <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {competitor.name}
              </h1>

              <p className="text-sm text-slate-400">
                {competitor.description || "No company description available."}
              </p>

              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-400 transition hover:text-blue-300"
                >
                  Visit website
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/competitors"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
          >
            All competitors
          </Link>
        </div>
      </header>

      {/* Competitive scores */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Competitive positioning
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current competitive performance indicators.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ScoreCard
            label="Market strength"
            score={competitor.marketStrength}
            color="blue"
          />

          <ScoreCard
            label="Innovation score"
            score={competitor.innovationScore}
            color="violet"
          />
        </div>
      </section>

      {/* Company information */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">
          Company intelligence
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProfileSection
            title="Products and services"
            content={competitor.products}
          />

          <ProfileSection
            title="Pricing strategy"
            content={competitor.pricing}
          />

          <ProfileSection
            title="Strengths"
            content={competitor.strengths}
            color="emerald"
          />

          <ProfileSection
            title="Weaknesses"
            content={competitor.weaknesses}
            color="rose"
          />
        </div>
      </section>

      {/* AI competitor intelligence */}
      <CompetitorResearchPanel
        competitorId={competitor.id}
        competitorName={competitor.name}
      />

      {/* Record information */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Record information
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="mt-1 text-sm font-medium text-slate-300">
              {createdDate}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Last updated</p>
            <p className="mt-1 text-sm font-medium text-slate-300">
              {updatedDate}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
