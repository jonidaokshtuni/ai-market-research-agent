"use client";

import { useMemo, useState } from "react";
import type { Competitor, CompetitorSortOption } from "./types";
import {
  COMPETITOR_INDUSTRY_OPTIONS,
  COMPETITOR_PAGE_SIZE,
  COMPETITOR_SORT_OPTIONS,
} from "./constants";
import CompetitorCard from "./competitor-card";

type CompetitorListProps = {
  competitors: Competitor[];
  onEdit: (competitor: Competitor) => void;
  onDelete: (competitor: Competitor) => void;
  deletingId?: string | null;
};

export default function CompetitorList({
  competitors,
  onEdit,
  onDelete,
  deletingId = null,
}: CompetitorListProps) {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [sortBy, setSortBy] = useState<CompetitorSortOption>("newest");
  const [page, setPage] = useState(1);

  const filteredCompetitors = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = competitors.filter((competitor) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          competitor.name,
          competitor.industry,
          competitor.description,
          competitor.products,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesIndustry =
        industry === "all" || competitor.industry === industry;

      return matchesSearch && matchesIndustry;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
          );

        case "name":
          return a.name.localeCompare(b.name);

        case "market-strength":
          return b.marketStrength - a.marketStrength;

        case "innovation":
          return b.innovationScore - a.innovationScore;

        case "newest":
        default:
          return (
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime()
          );
      }
    });
  }, [competitors, search, industry, sortBy]);

  const totalPages = Math.ceil(
    filteredCompetitors.length / COMPETITOR_PAGE_SIZE
  );

  const currentPage = Math.min(page, Math.max(totalPages, 1));

  const paginatedCompetitors = filteredCompetitors.slice(
    (currentPage - 1) * COMPETITOR_PAGE_SIZE,
    currentPage * COMPETITOR_PAGE_SIZE
  );

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleIndustryChange(value: string) {
    setIndustry(value);
    setPage(1);
  }

  function handleSortChange(value: CompetitorSortOption) {
    setSortBy(value);
    setPage(1);
  }

  const hasActiveFilters = search.trim() !== "" || industry !== "all";

  function clearFilters() {
    setSearch("");
    setIndustry("all");
    setSortBy("newest");
    setPage(1);
  }

  return (
    <section className="space-y-6">
      {/* Search and filters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <label
              htmlFor="competitor-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Search competitors
            </label>

            <input
              id="competitor-search"
              type="search"
              value={search}
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Search companies..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="competitor-industry-filter"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Industry
            </label>

            <select
              id="competitor-industry-filter"
              value={industry}
              onChange={(event) => handleIndustryChange(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All industries</option>

              {COMPETITOR_INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="competitor-sort"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Sort by
            </label>

            <select
              id="competitor-sort"
              value={sortBy}
              onChange={(event) =>
                handleSortChange(event.target.value as CompetitorSortOption)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {COMPETITOR_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400" aria-live="polite">
            Showing{" "}
            <span className="font-semibold text-white">
              {filteredCompetitors.length}
            </span>{" "}
            {filteredCompetitors.length === 1 ? "competitor" : "competitors"}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-left text-sm font-medium text-blue-400 transition hover:text-blue-300 sm:text-right"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {paginatedCompetitors.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedCompetitors.map((competitor) => (
            <CompetitorCard
              key={competitor.id}
              competitor={competitor}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingId === competitor.id}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-14 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
            {competitors.length === 0 ? "⌕" : "↗"}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-white">
            {competitors.length === 0
              ? "No competitors yet"
              : "No matching competitors"}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            {competitors.length === 0
              ? "Add your first competitor to start building your competitive intelligence database."
              : "Try changing your search or industry filters to find the company you're looking for."}
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          aria-label="Competitor pagination"
          className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
