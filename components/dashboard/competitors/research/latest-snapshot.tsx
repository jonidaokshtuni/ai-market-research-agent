import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Search,
  Wrench,
} from "lucide-react";

import type { CompetitorSnapshot, Importance } from "./types";
import { formatDate } from "./utils";
import { SourceLink } from "./source-link";

type LatestSnapshotProps = {
  snapshot: CompetitorSnapshot;
};

const importanceStyles: Record<Importance, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-300",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  low: "border-slate-600/40 bg-slate-800/70 text-slate-300",
};

function ImportanceBadge({ importance }: { importance: Importance }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md border px-2 py-1 text-xs font-medium capitalize ${importanceStyles[importance]}`}
    >
      {importance} importance
    </span>
  );
}

export function LatestSnapshot({ snapshot }: LatestSnapshotProps) {
  const findings = snapshot.findings ?? [];
  const insights = snapshot.keyInsights ?? [];
  const limitations = snapshot.limitations ?? [];
  const sources = snapshot.sources ?? [];
  const toolsUsed = snapshot.toolsUsed ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
      <div className="border-b border-slate-800 p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300">
            <Search className="h-3.5 w-3.5" />
            Latest research
          </span>

          <span className="text-xs text-slate-500">
            {formatDate(snapshot.createdAt)}
          </span>
        </div>

        <h3 className="text-base font-semibold text-white">Research summary</h3>

        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
          {snapshot.summary || "No research summary available."}
        </p>

        {snapshot.researchTask && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Research task
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-300">
              {snapshot.researchTask}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        {findings.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-white">
                Research findings
              </h4>
              <span className="text-xs text-slate-500">
                ({findings.length})
              </span>
            </div>

            <div className="space-y-3">
              {findings.map((finding, index) => (
                <article
                  key={`${finding.title}-${index}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h5 className="min-w-0 flex-1 break-words text-sm font-medium text-slate-200">
                      {finding.title}
                    </h5>

                    <ImportanceBadge importance={finding.importance} />
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400">
                    {finding.description}
                  </p>

                  {finding.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {finding.sources.map((source, sourceIndex) => (
                        <SourceLink
                          key={`${source.url}-${sourceIndex}`}
                          source={source}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {insights.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-white">Key insights</h4>
            </div>

            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li
                  key={`${insight}-${index}`}
                  className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/30 p-3"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                    {insight}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {limitations.length > 0 && (
          <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-300">
                Research limitations
              </h4>
            </div>

            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-400">
              {limitations.map((limitation, index) => (
                <li key={`${limitation}-${index}`} className="break-words">
                  {limitation}
                </li>
              ))}
            </ul>
          </section>
        )}

        {toolsUsed.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-purple-400" />
              <h4 className="text-sm font-semibold text-white">Tools used</h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {toolsUsed.map((tool, index) => (
                <span
                  key={`${tool}-${index}`}
                  className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300"
                >
                  {tool}
                </span>
              ))}
            </div>
          </section>
        )}

        {sources.length > 0 && (
          <section className="border-t border-slate-800 pt-4">
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Research sources ({sources.length})
            </h4>

            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <SourceLink
                  key={`${source.url}-${index}`}
                  source={source}
                  compact
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
