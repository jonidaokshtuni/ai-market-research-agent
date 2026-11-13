"use client";

import { AlertCircle, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChangeHistory } from "./research/change-history";
import { LatestSnapshot } from "./research/latest-snapshot";
import { ResearchHistory } from "./research/research-history";
import {
  getApiError,
  isRecord,
  parseComparisonsResponse,
  parseSnapshot,
  parseSnapshotsResponse,
  readJson,
} from "./research/schemas";
import type {
  CompetitorComparison,
  CompetitorResearchPanelProps,
  CompetitorSnapshot,
  Pagination,
} from "./research/types";

const SNAPSHOT_PAGE_SIZE = 10;
const COMPARISON_PAGE_SIZE = 20;

function mergeUniqueById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  append: boolean
): T[] {
  const seen = new Set<string>();
  const records = append ? [...current, ...incoming] : incoming;

  return records.filter((record) => {
    if (seen.has(record.id)) {
      return false;
    }

    seen.add(record.id);
    return true;
  });
}

export function CompetitorResearchPanel({
  competitorId,
  competitorName,
}: CompetitorResearchPanelProps) {
  const [snapshots, setSnapshots] = useState<CompetitorSnapshot[]>([]);
  const [snapshotPagination, setSnapshotPagination] =
    useState<Pagination | null>(null);

  const [comparisons, setComparisons] = useState<CompetitorComparison[]>([]);
  const [comparisonPagination, setComparisonPagination] =
    useState<Pagination | null>(null);

  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(true);
  const [isLoadingComparisons, setIsLoadingComparisons] = useState(true);

  const [isLoadingMoreSnapshots, setIsLoadingMoreSnapshots] = useState(false);
  const [isLoadingMoreComparisons, setIsLoadingMoreComparisons] =
    useState(false);

  const [isResearching, setIsResearching] = useState(false);

  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  const snapshotRequestId = useRef(0);
  const comparisonRequestId = useRef(0);
  const researchRequestId = useRef(0);

  const snapshotController = useRef<AbortController | null>(null);
  const comparisonController = useRef<AbortController | null>(null);
  const researchController = useRef<AbortController | null>(null);

  const researchInFlight = useRef(false);

  const fetchSnapshots = useCallback(
    async (offset = 0, append = false) => {
      snapshotController.current?.abort();

      const controller = new AbortController();
      snapshotController.current = controller;

      const requestId = ++snapshotRequestId.current;

      if (append) {
        setIsLoadingMoreSnapshots(true);
      } else {
        setIsLoadingMoreSnapshots(false);
        setIsLoadingSnapshots(true);
      }

      setSnapshotError(null);

      try {
        const params = new URLSearchParams({
          limit: String(SNAPSHOT_PAGE_SIZE),
          offset: String(offset),
        });

        const response = await fetch(
          `/api/competitors/${encodeURIComponent(
            competitorId
          )}/snapshots?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(
            getApiError(data, "Unable to load research history.")
          );
        }

        const result = parseSnapshotsResponse(data);

        if (
          result.pagination.offset !== offset ||
          result.pagination.limit !== SNAPSHOT_PAGE_SIZE
        ) {
          throw new Error(
            "The server returned unexpected research pagination."
          );
        }

        if (
          controller.signal.aborted ||
          requestId !== snapshotRequestId.current
        ) {
          return;
        }

        setSnapshots((current) =>
          mergeUniqueById(current, result.snapshots, append)
        );

        setSnapshotPagination(result.pagination);
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== snapshotRequestId.current
        ) {
          return;
        }

        setSnapshotError(
          error instanceof Error
            ? error.message
            : "Unable to load research history."
        );
      } finally {
        if (requestId === snapshotRequestId.current) {
          if (append) {
            setIsLoadingMoreSnapshots(false);
          } else {
            setIsLoadingSnapshots(false);
          }

          if (snapshotController.current === controller) {
            snapshotController.current = null;
          }
        }
      }
    },
    [competitorId]
  );

  const fetchComparisons = useCallback(
    async (offset = 0, append = false) => {
      comparisonController.current?.abort();

      const controller = new AbortController();
      comparisonController.current = controller;

      const requestId = ++comparisonRequestId.current;

      if (append) {
        setIsLoadingMoreComparisons(true);
      } else {
        setIsLoadingMoreComparisons(false);
        setIsLoadingComparisons(true);
      }

      setComparisonError(null);

      try {
        const params = new URLSearchParams({
          limit: String(COMPARISON_PAGE_SIZE),
          offset: String(offset),
        });

        const response = await fetch(
          `/api/competitors/${encodeURIComponent(
            competitorId
          )}/comparisons?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await readJson(response);

        if (!response.ok) {
          throw new Error(
            getApiError(data, "Unable to load comparison history.")
          );
        }

        const result = parseComparisonsResponse(data);

        if (
          result.pagination.offset !== offset ||
          result.pagination.limit !== COMPARISON_PAGE_SIZE
        ) {
          throw new Error(
            "The server returned unexpected comparison pagination."
          );
        }

        if (
          controller.signal.aborted ||
          requestId !== comparisonRequestId.current
        ) {
          return;
        }

        setComparisons((current) =>
          mergeUniqueById(current, result.comparisons, append)
        );

        setComparisonPagination(result.pagination);
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== comparisonRequestId.current
        ) {
          return;
        }

        setComparisonError(
          error instanceof Error
            ? error.message
            : "Unable to load comparison history."
        );
      } finally {
        if (requestId === comparisonRequestId.current) {
          if (append) {
            setIsLoadingMoreComparisons(false);
          } else {
            setIsLoadingComparisons(false);
          }

          if (comparisonController.current === controller) {
            comparisonController.current = null;
          }
        }
      }
    },
    [competitorId]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSnapshots([]);
      setSnapshotPagination(null);
      setComparisons([]);
      setComparisonPagination(null);

      setSnapshotError(null);
      setComparisonError(null);
      setResearchError(null);

      setIsLoadingSnapshots(true);
      setIsLoadingComparisons(true);
      setIsLoadingMoreSnapshots(false);
      setIsLoadingMoreComparisons(false);
      setIsResearching(false);

      void fetchSnapshots();
      void fetchComparisons();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);

      snapshotController.current?.abort();
      comparisonController.current?.abort();
      researchController.current?.abort();

      snapshotRequestId.current += 1;
      comparisonRequestId.current += 1;
      researchRequestId.current += 1;

      researchInFlight.current = false;
    };
  }, [fetchSnapshots, fetchComparisons]);

  const handleResearch = useCallback(async () => {
    if (researchInFlight.current) {
      return;
    }

    researchInFlight.current = true;

    researchController.current?.abort();

    const controller = new AbortController();
    researchController.current = controller;

    const requestId = ++researchRequestId.current;

    setIsResearching(true);
    setResearchError(null);

    try {
      const response = await fetch(
        `/api/competitors/${encodeURIComponent(competitorId)}/snapshots`,
        {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          getApiError(data, "Unable to run competitor research.")
        );
      }

      if (
        controller.signal.aborted ||
        requestId !== researchRequestId.current
      ) {
        return;
      }

      if (!isRecord(data)) {
        throw new Error("The server returned an invalid research result.");
      }

      const savedSnapshot = parseSnapshot(data.snapshot);

      if (!savedSnapshot) {
        throw new Error("The server returned an invalid research snapshot.");
      }

      await Promise.all([fetchSnapshots(), fetchComparisons()]);
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestId !== researchRequestId.current
      ) {
        return;
      }

      setResearchError(
        error instanceof Error
          ? error.message
          : "Unable to run competitor research."
      );
    } finally {
      if (requestId === researchRequestId.current) {
        researchInFlight.current = false;
        setIsResearching(false);

        if (researchController.current === controller) {
          researchController.current = null;
        }
      }
    }
  }, [competitorId, fetchSnapshots, fetchComparisons]);

  const handleRefreshSnapshots = useCallback(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  const handleRefreshComparisons = useCallback(() => {
    void fetchComparisons();
  }, [fetchComparisons]);

  const handleLoadMoreSnapshots = useCallback(() => {
    if (
      isLoadingSnapshots ||
      isLoadingMoreSnapshots ||
      !snapshotPagination?.hasMore ||
      snapshotPagination.nextOffset === null
    ) {
      return;
    }

    void fetchSnapshots(snapshotPagination.nextOffset, true);
  }, [
    fetchSnapshots,
    isLoadingSnapshots,
    isLoadingMoreSnapshots,
    snapshotPagination,
  ]);

  const handleLoadMoreComparisons = useCallback(() => {
    if (
      isLoadingComparisons ||
      isLoadingMoreComparisons ||
      !comparisonPagination?.hasMore ||
      comparisonPagination.nextOffset === null
    ) {
      return;
    }

    void fetchComparisons(comparisonPagination.nextOffset, true);
  }, [
    fetchComparisons,
    isLoadingComparisons,
    isLoadingMoreComparisons,
    comparisonPagination,
  ]);

  const latestSnapshot = snapshots[0] ?? null;

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10">
            <Sparkles className="h-5 w-5 text-violet-400" aria-hidden="true" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-white">
              AI Competitor Intelligence
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Research {competitorName}, identify strategic insights, and track
              changes over time.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResearch}
          disabled={isResearching}
          aria-busy={isResearching}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isResearching ? (
            <>
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
              Researching...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Run AI Research
            </>
          )}
        </button>
      </div>

      {isResearching && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"
        >
          <LoaderCircle
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-400"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-medium text-violet-200">
              Competitor research in progress
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Gathering and analyzing available information. This may take a few
              moments.
            </p>
          </div>
        </div>
      )}

      {researchError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
        >
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
            aria-hidden="true"
          />

          <div>
            <p className="text-sm font-medium text-red-300">Research failed</p>

            <p className="mt-1 text-sm leading-6 text-red-400/80">
              {researchError}
            </p>
          </div>
        </div>
      )}

      {latestSnapshot && !isLoadingSnapshots && (
        <LatestSnapshot snapshot={latestSnapshot} />
      )}

      {!latestSnapshot && isLoadingSnapshots && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      )}

      {!latestSnapshot && snapshotError && !isLoadingSnapshots && (
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
                Unable to load the latest research
              </p>
              <p className="mt-1 text-sm text-red-400/80">{snapshotError}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshSnapshots}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      <ChangeHistory
        comparisons={comparisons}
        pagination={comparisonPagination}
        isLoading={isLoadingComparisons}
        isLoadingMore={isLoadingMoreComparisons}
        error={comparisonError}
        competitorName={competitorName}
        snapshotCount={snapshots.length}
        onRefresh={handleRefreshComparisons}
        onLoadMore={handleLoadMoreComparisons}
      />

      <ResearchHistory
        snapshots={snapshots}
        pagination={snapshotPagination}
        isLoading={isLoadingSnapshots}
        isLoadingMore={isLoadingMoreSnapshots}
        error={snapshotError}
        onRefresh={handleRefreshSnapshots}
        onLoadMore={handleLoadMoreSnapshots}
      />
    </section>
  );
}
