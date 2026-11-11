"use client";

import { useMemo, useState } from "react";

type Source = {
  title?: string;
  url: string;
  snippet?: string;
};

type MarketReport = {
  summary?: string;
  keyTrends?: string[];
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  recommendation?: string;
};

export type ResearchReport = {
  id: string;
  sessionId: string;
  sessionTitle: string;
  report: MarketReport | null;
  sources: Source[] | null;
  createdAt: Date | string;
};

type Filter = "all" | "with-sources" | "without-sources";
type Sort = "newest" | "oldest" | "title";

function formatDate(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ReportSection({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-slate-200">{title}</h4>
      <ul className="list-inside list-disc space-y-1.5 text-sm leading-6 text-slate-400">
        {items.map((item, index) => (
          <li key={`${title}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default function ReportsLibrary({
  reports,
}: {
  reports: ResearchReport[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = reports.filter((item) => {
      const hasSources = Array.isArray(item.sources) && item.sources.length > 0;

      if (filter === "with-sources" && !hasSources) return false;
      if (filter === "without-sources" && hasSources) return false;

      if (!normalizedSearch) return true;

      const report = item.report;

      const searchableText = [
        item.sessionTitle,
        report?.summary,
        report?.recommendation,
        ...(report?.keyTrends ?? []),
        ...(report?.swot?.strengths ?? []),
        ...(report?.swot?.weaknesses ?? []),
        ...(report?.swot?.opportunities ?? []),
        ...(report?.swot?.threats ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

    return filtered.sort((a, b) => {
      if (sort === "title") {
        return a.sessionTitle.localeCompare(b.sessionTitle);
      }

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return sort === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [reports, search, filter, sort]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Total reports</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {reports.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">With sources</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {
              reports.filter(
                (item) => Array.isArray(item.sources) && item.sources.length > 0
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-slate-400">Without sources</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {
              reports.filter(
                (item) =>
                  !Array.isArray(item.sources) || item.sources.length === 0
              ).length
            }
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:flex-row">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reports, trends, recommendations..."
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as Filter)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-indigo-500"
        >
          <option value="all">All reports</option>
          <option value="with-sources">With sources</option>
          <option value="without-sources">Without sources</option>
        </select>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300 outline-none focus:border-indigo-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Saved research reports
        </h2>
        <p className="text-sm text-slate-500">
          {filteredReports.length}{" "}
          {filteredReports.length === 1 ? "report" : "reports"}
        </p>
      </div>

      {filteredReports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-14 text-center">
          <h3 className="text-base font-semibold text-white">
            {reports.length === 0 ? "No reports yet" : "No matching reports"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            {reports.length === 0
              ? "Generate a SWOT research report in your research workspace. Your saved reports will appear here."
              : "Try changing your search or filters to find a report."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((item) => {
            const isExpanded = expandedId === item.id;
            const report = item.report;
            const sources = Array.isArray(item.sources) ? item.sources : [];

            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 transition hover:border-slate-700 ${
                  isExpanded ? "report-print-area" : ""
                }`}
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-300">
                          SWOT report
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-white">
                        {item.sessionTitle}
                      </h3>

                      {report?.summary && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                          {report.summary}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>
                          {sources.length}{" "}
                          {sources.length === 1 ? "source" : "sources"}
                        </span>
                        {report?.keyTrends && (
                          <span>{report.keyTrends.length} key trends</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="report-print-hide shrink-0 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white"
                    >
                      {isExpanded ? "Close report" : "View report"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-6 space-y-6 border-t border-slate-800 pt-6">
                      <div className="border-b border-slate-200 pb-5">
                        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                          AI Market Intelligence
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-slate-900">
                          {item.sessionTitle}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                          Generated on {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <div className="report-print-hide flex justify-end">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                          Export PDF
                        </button>
                      </div>

                      {report?.summary && (
                        <section>
                          <h4 className="mb-2 text-sm font-semibold text-white">
                            Executive summary
                          </h4>
                          <p className="text-sm leading-7 text-slate-300">
                            {report.summary}
                          </p>
                        </section>
                      )}

                      <ReportSection
                        title="Key trends"
                        items={report?.keyTrends}
                      />

                      {report?.swot && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-white">
                            SWOT analysis
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                              <ReportSection
                                title="Strengths"
                                items={report.swot.strengths}
                              />
                            </div>
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                              <ReportSection
                                title="Weaknesses"
                                items={report.swot.weaknesses}
                              />
                            </div>
                            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                              <ReportSection
                                title="Opportunities"
                                items={report.swot.opportunities}
                              />
                            </div>
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                              <ReportSection
                                title="Threats"
                                items={report.swot.threats}
                              />
                            </div>
                          </div>
                        </section>
                      )}

                      {report?.recommendation && (
                        <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                          <h4 className="mb-2 text-sm font-semibold text-indigo-200">
                            Strategic recommendation
                          </h4>
                          <p className="text-sm leading-7 text-slate-300">
                            {report.recommendation}
                          </p>
                        </section>
                      )}

                      {sources.length > 0 && (
                        <section>
                          <h4 className="mb-3 text-sm font-semibold text-white">
                            Research sources ({sources.length})
                          </h4>
                          <div className="space-y-2">
                            {sources.map((source, index) => (
                              <a
                                key={`${source.url}-${index}`}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-indigo-500/40"
                              >
                                <p className="break-all text-sm font-medium text-indigo-300">
                                  {source.title || source.url}
                                </p>
                                {source.snippet && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {source.snippet}
                                  </p>
                                )}
                              </a>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
