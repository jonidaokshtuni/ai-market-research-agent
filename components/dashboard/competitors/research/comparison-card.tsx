import {
  AlertCircle,
  Clock3,
  GitBranch,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { formatDate, formatCount } from "./utils";
import { ChangeCard } from "./change-card";
import { SourceLink } from "./source-link";
import type { CompetitorComparison } from "./types";

type ComparisonCardProps = {
  comparison: CompetitorComparison;
};

function getImpactStyles(impact: CompetitorComparison["overallImpact"]) {
  switch (impact) {
    case "high":
      return {
        label: "High impact",
        className: "border-red-500/20 bg-red-500/10 text-red-400",
        Icon: TrendingUp,
      };

    case "medium":
      return {
        label: "Medium impact",
        className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
        Icon: TrendingDown,
      };

    case "low":
      return {
        label: "Low impact",
        className: "border-blue-500/20 bg-blue-500/10 text-blue-400",
        Icon: Minus,
      };

    default:
      return {
        label: "No significant impact",
        className: "border-slate-700 bg-slate-800/70 text-slate-400",
        Icon: Minus,
      };
  }
}

export function ComparisonCard({ comparison }: ComparisonCardProps) {
  const impact = getImpactStyles(comparison.overallImpact);
  const ImpactIcon = impact.Icon;

  const highImpactCount = comparison.changes.filter(
    (change) => change.impact === "high"
  ).length;

  return (
    <article className="relative border-l border-slate-800 pb-8 pl-6 last:border-l-transparent last:pb-0">
      <div className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
        <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            {formatDate(comparison.createdAt)}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            Competitor change analysis
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${impact.className}`}
          >
            <ImpactIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {impact.label}
          </span>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">
            Competitor change analysis
          </h4>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {comparison.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
          <span>
            {formatCount(comparison.changes.length, "change", "changes")}
            {" detected"}
          </span>

          <span>
            {formatCount(
              highImpactCount,
              "high-impact change",
              "high-impact changes"
            )}
          </span>
        </div>

        {comparison.changes.length > 0 ? (
          <div className="space-y-3">
            {comparison.changes.map((change, index) => (
              <ChangeCard
                key={`${comparison.id}-${change.category}-${change.changeType}-${index}`}
                change={change}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />

            <p className="text-sm text-slate-400">
              No significant changes were identified between these research
              snapshots.
            </p>
          </div>
        )}

        {comparison.sources.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Comparison sources
            </p>

            <div className="flex flex-wrap gap-2">
              {comparison.sources.map((source, index) => (
                <SourceLink
                  key={`${comparison.id}-source-${index}`}
                  source={source}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {comparison.limitations.length > 0 && (
          <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
              Analysis limitations
            </p>

            <ul className="space-y-1.5">
              {comparison.limitations.map((limitation, index) => (
                <li
                  key={`${comparison.id}-limitation-${index}`}
                  className="text-xs leading-5 text-slate-400"
                >
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
