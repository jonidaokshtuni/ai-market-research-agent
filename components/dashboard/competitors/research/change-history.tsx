import {
  AlertCircle,
  GitBranch,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";

import { formatCount } from "./utils";
import { ComparisonCard } from "./comparison-card";
import type { CompetitorComparison, Pagination } from "./types";

type ChangeHistoryProps = {
  comparisons: CompetitorComparison[];
  pagination: Pagination | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  competitorName: string;
  snapshotCount: number;
  onRefresh: () => void;
  onLoadMore: () => void;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="relative border-l border-slate-800 pb-8 pl-6"
        >
          <div className="absolute -left-[17px] top-0 h-8 w-8 rounded-full border border-slate-800 bg-slate-900" />

          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-800" />
            <div className="h-5 w-64 max-w-full animate-pulse rounded bg-slate-800" />
            <div className="h-16 animate-pulse rounded-lg bg-slate-800/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChangeHistory({
  comparisons,
  pagination,
  isLoading,
  isLoadingMore,
  error,
  competitorName,
  snapshotCount,
  onRefresh,
  onLoadMore,
}: ChangeHistoryProps) {
  const canLoadMore = pagination?.hasMore === true;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <GitBranch className="h-5 w-5 text-violet-400" aria-hidden="true" />

            <h3 className="text-base font-semibold text-white">
              Competitor Change Detection
            </h3>

            {!isLoading && (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {comparisons.length}
                {canLoadMore ? "+" : ""}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Track strategic, product, pricing, and positioning changes detected
            for {competitorName}.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading || isLoadingMore}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
              aria-hidden="true"
            />

            <div>
              <p className="text-sm font-medium text-red-300">
                Unable to load comparison history
              </p>
              <p className="mt-1 text-sm text-red-400/80">{error}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : comparisons.length > 0 ? (
        <div className="space-y-0">
          {comparisons.map((comparison) => (
            <ComparisonCard key={comparison.id} comparison={comparison} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
            {snapshotCount >= 2 ? (
              <Zap className="h-5 w-5 text-violet-400" aria-hidden="true" />
            ) : (
              <Sparkles
                className="h-5 w-5 text-violet-400"
                aria-hidden="true"
              />
            )}
          </div>

          <h4 className="mt-4 text-sm font-semibold text-white">
            {snapshotCount >= 2
              ? "No significant changes detected"
              : "Change detection starts with your next research run"}
          </h4>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            {snapshotCount >= 2
              ? `No significant differences were identified across the available research snapshots for ${competitorName}.`
              : "Run AI research to establish a baseline. Once another snapshot is available, the system can compare findings and identify meaningful changes."}
          </p>
        </div>
      )}

      {canLoadMore && !isLoading && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                Loading more...
              </>
            ) : (
              <>
                Load more comparisons
                <span className="text-xs text-slate-500">
                  (
                  {formatCount(
                    pagination?.nextOffset ?? comparisons.length,
                    "record",
                    "records"
                  )}{" "}
                  loaded)
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
