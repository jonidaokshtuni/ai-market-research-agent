import {
  AlertCircle,
  ChevronDown,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { formatDate, formatCount } from "./utils";
import { SourceLink } from "./source-link";
import type { CompetitorSnapshot, Pagination } from "./types";

type ResearchHistoryProps = {
  snapshots: CompetitorSnapshot[];
  pagination: Pagination | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-800" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function SnapshotDetails({ snapshot }: { snapshot: CompetitorSnapshot }) {
  return (
    <div className="space-y-5 border-t border-slate-800 px-4 py-5">
      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Executive summary
        </h5>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {snapshot.summary}
        </p>
      </div>

      {snapshot.keyInsights.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Key strategic insights
          </h5>

          <ul className="mt-3 space-y-2">
            {snapshot.keyInsights.map((insight, index) => (
              <li
                key={`${snapshot.id}-insight-${index}`}
                className="flex items-start gap-2 text-sm leading-6 text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.findings.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Research findings
          </h5>

          <div className="mt-3 space-y-3">
            {snapshot.findings.map((finding, index) => (
              <div
                key={`${snapshot.id}-finding-${index}`}
                className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h6 className="text-sm font-medium text-slate-200">
                    {finding.title}
                  </h6>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      finding.importance === "high"
                        ? "border-red-500/20 bg-red-500/10 text-red-400"
                        : finding.importance === "medium"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {finding.importance} importance
                  </span>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                  {finding.description}
                </p>

                {finding.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {finding.sources.map((source, sourceIndex) => (
                      <SourceLink
                        key={`${snapshot.id}-finding-${index}-source-${sourceIndex}`}
                        source={source}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot.limitations.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Research limitations
          </h5>

          <ul className="mt-2 space-y-1.5">
            {snapshot.limitations.map((limitation, index) => (
              <li
                key={`${snapshot.id}-limitation-${index}`}
                className="text-sm leading-6 text-slate-400"
              >
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.sources.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Research sources
          </h5>

          <div className="mt-3 flex flex-wrap gap-2">
            {snapshot.sources.map((source, index) => (
              <SourceLink
                key={`${snapshot.id}-source-${index}`}
                source={source}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {snapshot.toolsUsed.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tools used
          </h5>

          <div className="mt-2 flex flex-wrap gap-2">
            {snapshot.toolsUsed.map((tool, index) => (
              <span
                key={`${snapshot.id}-tool-${index}`}
                className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs text-slate-400"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResearchHistory({
  snapshots,
  pagination,
  isLoading,
  isLoadingMore,
  error,
  onRefresh,
  onLoadMore,
}: ResearchHistoryProps) {
  const canLoadMore = pagination?.hasMore === true;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="h-5 w-5 text-violet-400" aria-hidden="true" />

            <h3 className="text-base font-semibold text-white">
              Research History
            </h3>

            {!isLoading && (
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {snapshots.length}
                {canLoadMore ? "+" : ""}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-slate-400">
            Review previous AI research runs and their findings.
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
                Unable to load research history
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
      ) : snapshots.length > 0 ? (
        <div className="space-y-3">
          {snapshots.map((snapshot, index) => (
            <details
              key={snapshot.id}
              open={index === 0}
              className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-slate-700"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {formatDate(snapshot.createdAt)}
                    </span>

                    {index === 0 && (
                      <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                        Latest
                      </span>
                    )}
                  </div>

                  <p className="mt-2 truncate text-sm font-medium text-white">
                    {snapshot.researchTask}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                    {snapshot.summary}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatCount(snapshot.findings.length, "finding")}
                    {" · "}
                    {formatCount(snapshot.sources.length, "source")}
                  </p>
                </div>

                <ChevronDown
                  className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <SnapshotDetails snapshot={snapshot} />
            </details>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-5 py-10 text-center">
          <Clock3
            className="mx-auto h-8 w-8 text-slate-600"
            aria-hidden="true"
          />

          <h4 className="mt-3 text-sm font-semibold text-white">
            No research history yet
          </h4>

          <p className="mt-2 text-sm text-slate-400">
            Run AI research to create the first competitor snapshot. Your
            research history will appear here.
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
                Load more research
                <span className="text-xs text-slate-500">
                  (
                  {formatCount(
                    pagination?.nextOffset ?? snapshots.length,
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
