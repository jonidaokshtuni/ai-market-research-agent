"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Clock3,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  Minus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

type Source = {
  title: string;
  url: string;
};

type SnapshotFinding = {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  sources: Source[];
};

type CompetitorSnapshot = {
  id: string;
  researchTask: string;
  summary: string;
  findings: SnapshotFinding[];
  keyInsights: string[];
  limitations: string[];
  sources: Source[];
  toolsUsed: string[];
  createdAt: string;
};

type CompetitorChange = {
  category:
    | "product"
    | "pricing"
    | "positioning"
    | "strategy"
    | "strength"
    | "weakness"
    | "market";
  changeType: "new" | "changed" | "removed" | "strategic_shift";
  title: string;
  description: string;
  previousValue: string | null;
  currentValue: string | null;
  impact: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  sources: Source[];
};

type CompetitorComparison = {
  id: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  summary: string;
  overallImpact: "high" | "medium" | "low" | "none";
  changes: CompetitorChange[];
  limitations: string[];
  sources: Source[];
  createdAt: string;
};

type Pagination = {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};

type Props = {
  competitorId: string;
  competitorName: string;
};

const importanceStyles = {
  high: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  low: "border-slate-700 bg-slate-800 text-slate-400",
};

const impactStyles = {
  high: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  low: "border-slate-700 bg-slate-800 text-slate-400",
  none: "border-slate-700 bg-slate-800 text-slate-400",
};

const changeTypeStyles = {
  new: {
    label: "New",
    icon: TrendingUp,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  changed: {
    label: "Changed",
    icon: RefreshCw,
    className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  },
  removed: {
    label: "Removed",
    icon: TrendingDown,
    className: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  },
  strategic_shift: {
    label: "Strategic shift",
    icon: GitBranch,
    className: "border-purple-500/20 bg-purple-500/10 text-purple-400",
  },
};

const categoryLabels: Record<CompetitorChange["category"], string> = {
  product: "Product",
  pricing: "Pricing",
  positioning: "Positioning",
  strategy: "Strategy",
  strength: "Strength",
  weakness: "Weakness",
  market: "Market",
};

function formatDate(date: string) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ChangeCard({ change }: { change: CompetitorChange }) {
  const type = changeTypeStyles[change.changeType];
  const TypeIcon = type.icon;

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${type.className}`}
        >
          <TypeIcon className="size-3" />
          {type.label}
        </span>

        <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {categoryLabels[change.category]}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            impactStyles[change.impact]
          }`}
        >
          {change.impact} impact
        </span>
      </div>

      <h4 className="mt-3 text-sm font-semibold text-white">{change.title}</h4>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">
        {change.description}
      </p>

      {(change.previousValue !== null || change.currentValue !== null) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ArrowDown className="size-3" />
              Previous
            </div>

            <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
              {change.previousValue ?? "Not available"}
            </p>
          </div>

          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
              <ArrowUp className="size-3" />
              Current
            </div>

            <p className="whitespace-pre-line text-sm leading-6 text-slate-300">
              {change.currentValue ?? "Not available"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <span className="text-xs text-slate-500">
          Confidence:{" "}
          <span className="font-medium capitalize text-slate-300">
            {change.confidence}
          </span>
        </span>

        {change.sources.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {change.sources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 transition hover:text-blue-300"
              >
                {source.title}
                <ExternalLink className="size-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function ComparisonCard({ comparison }: { comparison: CompetitorComparison }) {
  return (
    <article className="relative border-l border-slate-800 pb-8 pl-6 last:border-l-transparent last:pb-0">
      <span className="absolute -left-[7px] top-1 flex size-3.5 items-center justify-center rounded-full border-2 border-blue-500 bg-slate-950">
        <span className="size-1 rounded-full bg-blue-400" />
      </span>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 className="size-3.5" />
              {formatDate(comparison.createdAt)}
            </p>

            <h3 className="mt-2 text-sm font-semibold text-white">
              Competitor change analysis
            </h3>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              impactStyles[comparison.overallImpact]
            }`}
          >
            {comparison.overallImpact === "none"
              ? "No significant impact"
              : `${comparison.overallImpact} impact`}
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-400">{comparison.summary}</p>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
            {comparison.changes.length}{" "}
            {comparison.changes.length === 1 ? "change" : "changes"} detected
          </span>

          {comparison.changes.filter((change) => change.impact === "high")
            .length > 0 && (
            <span className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-400">
              {
                comparison.changes.filter((change) => change.impact === "high")
                  .length
              }{" "}
              high-impact
            </span>
          )}
        </div>

        {comparison.changes.length > 0 ? (
          <div className="space-y-3">
            {comparison.changes.map((change, index) => (
              <ChangeCard
                key={`${comparison.id}-change-${index}`}
                change={change}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Minus className="size-4 text-slate-500" />
              No significant changes detected
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              The analysis did not identify meaningful competitive changes
              between these research snapshots.
            </p>
          </div>
        )}

        {comparison.sources.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comparison sources
            </p>

            <div className="flex flex-wrap gap-2">
              {comparison.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:border-blue-500/30 hover:text-blue-300"
                >
                  <span className="truncate">{source.title}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {comparison.limitations.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
              Comparison limitations
            </p>

            <ul className="space-y-1">
              {comparison.limitations.map((limitation, index) => (
                <li
                  key={`${comparison.id}-limitation-${index}`}
                  className="text-xs leading-5 text-slate-400"
                >
                  • {limitation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export default function CompetitorResearchPanel({
  competitorId,
  competitorName,
}: Props) {
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [comparisons, setComparisons] = useState<CompetitorComparison[]>([]);
  const [isLoadingComparisons, setIsLoadingComparisons] = useState(true);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(
    async (
      offset = 0,
      append = false,
      showLoading = true,
      signal?: AbortSignal
    ) => {
      try {
        // Defer state updates until after the effect's synchronous execution.
        await Promise.resolve();

        if (signal?.aborted) return;

        if (showLoading) {
          if (append) {
            setIsLoadingMore(true);
          } else {
            setIsLoading(true);
          }
        }

        const response = await fetch(
          `/api/competitors/${competitorId}/snapshots?limit=10&offset=${offset}`,
          { cache: "no-store", signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load research history.");
        }

        if (signal?.aborted) return;

        const newSnapshots = data.snapshots as CompetitorSnapshot[];

        setError(null);

        setSnapshots((previous) =>
          append ? [...previous, ...newSnapshots] : newSnapshots
        );

        setPagination(data.pagination as Pagination);
      } catch (error) {
        if (signal?.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading research."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [competitorId]
  );

  const fetchComparisons = useCallback(
    async (showLoading = true, signal?: AbortSignal) => {
      try {
        // Defer state updates until after the effect's synchronous execution.
        await Promise.resolve();

        if (signal?.aborted) return;

        if (showLoading) {
          setIsLoadingComparisons(true);
        }

        const response = await fetch(
          `/api/competitors/${competitorId}/comparisons?limit=20&offset=0`,
          { cache: "no-store", signal }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load competitor change history."
          );
        }

        if (signal?.aborted) return;

        setComparisonError(null);
        setComparisons(data.comparisons as CompetitorComparison[]);
      } catch (error) {
        if (signal?.aborted) return;

        setComparisonError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading change history."
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoadingComparisons(false);
        }
      }
    },
    [competitorId]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      void fetchSnapshots(0, false, false, controller.signal);
      void fetchComparisons(false, controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fetchSnapshots, fetchComparisons]);

  const handleResearch = async () => {
    try {
      setIsResearching(true);
      setError(null);

      const response = await fetch(
        `/api/competitors/${competitorId}/snapshots`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to complete competitor research."
        );
      }

      setIsLoading(true);
      setIsLoadingComparisons(true);
      setComparisonError(null);

      // Refresh both research snapshots and detected changes.
      await Promise.all([fetchSnapshots(), fetchComparisons()]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong during competitor research."
      );
    } finally {
      setIsResearching(false);
    }
  };

  const handleRefreshComparisons = () => {
    setIsLoadingComparisons(true);
    setComparisonError(null);
    void fetchComparisons(false);
  };

  const handleLoadMore = () => {
    if (
      pagination?.nextOffset === null ||
      pagination?.nextOffset === undefined
    ) {
      return;
    }

    setIsLoadingMore(true);
    void fetchSnapshots(pagination.nextOffset, true, false);
  };

  const latestSnapshot = snapshots[0];

  return (
    <section className="space-y-8">
      {/* Research header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-blue-400" />

            <h2 className="text-lg font-semibold text-white">
              AI Competitor Intelligence
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Research current developments, positioning, products, pricing,
            strengths, and competitive opportunities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResearch}
          disabled={isResearching}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isResearching ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Run AI Research
            </>
          )}
        </button>
      </div>

      {/* Research progress */}
      {isResearching && (
        <div
          className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <LoaderCircle className="size-5 animate-spin text-blue-400" />

            <div>
              <p className="text-sm font-semibold text-blue-300">
                Analyzing {competitorName}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Gathering information and generating strategic insights. This
                may take a little while.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Research error */}
      {error && (
        <div
          className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Latest research */}
      {latestSnapshot && (
        <div className="space-y-5 rounded-2xl border border-blue-500/20 bg-slate-950/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-blue-400" />
              <h3 className="font-semibold text-white">Latest AI analysis</h3>
            </div>

            <span className="text-xs text-slate-500">
              {formatDate(latestSnapshot.createdAt)}
            </span>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-300">
              Executive summary
            </h4>

            <p className="whitespace-pre-line text-sm leading-7 text-slate-400">
              {latestSnapshot.summary}
            </p>
          </div>

          {/* Key insights */}
          {latestSnapshot.keyInsights.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">
                Key strategic insights
              </h4>

              <ul className="space-y-2">
                {latestSnapshot.keyInsights.map((insight, index) => (
                  <li
                    key={`${latestSnapshot.id}-insight-${index}`}
                    className="flex gap-3 text-sm leading-6 text-slate-300"
                  >
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-400" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings */}
          {latestSnapshot.findings.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">
                Research findings
              </h4>

              <div className="space-y-3">
                {latestSnapshot.findings.map((finding, index) => (
                  <article
                    key={`${latestSnapshot.id}-finding-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-semibold text-slate-200">
                        {finding.title}
                      </h5>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                          importanceStyles[finding.importance]
                        }`}
                      >
                        {finding.importance} importance
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-400">
                      {finding.description}
                    </p>

                    {finding.sources.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {finding.sources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 transition hover:text-blue-300"
                          >
                            {source.title}
                            <ExternalLink className="size-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {latestSnapshot.sources.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">
                Research sources
              </h4>

              <div className="flex flex-wrap gap-2">
                {latestSnapshot.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:border-blue-500/30 hover:text-blue-300"
                  >
                    <span className="truncate">{source.title}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {latestSnapshot.limitations.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <h4 className="mb-2 text-sm font-semibold text-amber-400">
                Research limitations
              </h4>

              <ul className="space-y-1">
                {latestSnapshot.limitations.map((limitation, index) => (
                  <li
                    key={`${latestSnapshot.id}-limitation-${index}`}
                    className="text-sm leading-6 text-slate-400"
                  >
                    • {limitation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tools */}
          {latestSnapshot.toolsUsed.length > 0 && (
            <p className="text-xs text-slate-500">
              Tools used: {latestSnapshot.toolsUsed.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Competitor change history */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="size-5 text-purple-400" />

              <h3 className="font-semibold text-white">
                Competitor Change Detection
              </h3>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-400">
                {comparisons.length}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Track meaningful changes in {competitorName}&apos;s competitive
              position over time.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshComparisons}
            disabled={isLoadingComparisons}
            aria-label="Refresh competitor change history"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-blue-500/30 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${
                isLoadingComparisons ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {comparisonError && (
          <div
            className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-400" />

            <div>
              <p className="text-sm text-rose-300">{comparisonError}</p>

              <button
                type="button"
                onClick={handleRefreshComparisons}
                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {isLoadingComparisons ? (
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
              />
            ))}
          </div>
        ) : !comparisonError && comparisons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/5">
              <GitBranch className="size-6 text-purple-400" />
            </div>

            <h4 className="mt-4 text-sm font-semibold text-slate-200">
              No competitor changes detected yet
            </h4>

            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
              Your first research run establishes a baseline. Run AI research
              again to compare the latest findings and detect meaningful
              competitive changes.
            </p>

            {snapshots.length < 2 && (
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-blue-400">
                <Zap className="size-3.5" />
                {snapshots.length === 0
                  ? "Start with your first research snapshot"
                  : "Run research again to create your first comparison"}
              </p>
            )}
          </div>
        ) : (
          <div className="ml-2">
            {comparisons.map((comparison) => (
              <ComparisonCard key={comparison.id} comparison={comparison} />
            ))}
          </div>
        )}
      </div>

      {/* Research history */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock3 className="size-5 text-slate-400" />

          <h3 className="font-semibold text-white">Research history</h3>

          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-400">
            {snapshots.length}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
              />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-5 py-10 text-center">
            <Clock3 className="mx-auto size-8 text-slate-600" />

            <p className="mt-3 text-sm font-medium text-slate-300">
              No research history yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Run your first AI analysis to start tracking this competitor.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot, index) => (
              <details
                key={snapshot.id}
                className="group rounded-xl border border-slate-800 bg-slate-950/50"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {index === 0 ? "Latest research" : "Research snapshot"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(snapshot.createdAt)}
                    </p>

                    <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                      {snapshot.summary}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-slate-500 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>

                <div className="border-t border-slate-800 p-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-slate-400">
                    {snapshot.summary}
                  </p>

                  {snapshot.keyInsights.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Key insights
                      </p>

                      <ul className="space-y-2">
                        {snapshot.keyInsights.map((insight, insightIndex) => (
                          <li
                            key={`${snapshot.id}-history-${insightIndex}`}
                            className="text-sm text-slate-400"
                          >
                            • {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {pagination?.hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-blue-500/30 hover:bg-blue-500/5 disabled:opacity-50"
          >
            {isLoadingMore && <LoaderCircle className="size-4 animate-spin" />}

            {isLoadingMore ? "Loading..." : "Load more research"}
          </button>
        )}
      </div>
    </section>
  );
}
