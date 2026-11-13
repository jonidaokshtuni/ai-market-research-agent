import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";

import type {
  ChangeCategory,
  ChangeType,
  CompetitorChange,
  Importance,
} from "./types";
import { SourceLink } from "./source-link";

type ChangeCardProps = {
  change: CompetitorChange;
};

const categoryLabels: Record<ChangeCategory, string> = {
  product: "Product",
  pricing: "Pricing",
  positioning: "Positioning",
  strategy: "Strategy",
  strength: "Strength",
  weakness: "Weakness",
  market: "Market",
};

const changeTypeLabels: Record<ChangeType, string> = {
  new: "New",
  changed: "Changed",
  removed: "Removed",
  strategic_shift: "Strategic shift",
};

const importanceStyles: Record<Importance, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-300",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  low: "border-slate-500/20 bg-slate-500/10 text-slate-300",
};

const changeTypeStyles: Record<ChangeType, string> = {
  new: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  changed: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  removed: "border-red-500/20 bg-red-500/10 text-red-300",
  strategic_shift: "border-purple-500/20 bg-purple-500/10 text-purple-300",
};

function ChangeTypeIcon({ type }: { type: ChangeType }) {
  const className = "h-3.5 w-3.5";

  switch (type) {
    case "new":
      return <Plus className={className} />;
    case "removed":
      return <Minus className={className} />;
    case "changed":
      return <RefreshCw className={className} />;
    case "strategic_shift":
      return <Target className={className} />;
  }
}

function ValueBlock({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string | null;
  muted?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`whitespace-pre-wrap break-words text-sm ${
          muted ? "text-slate-400" : "text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ChangeCard({ change }: ChangeCardProps) {
  const hasPreviousValue = Boolean(change.previousValue);
  const hasCurrentValue = Boolean(change.currentValue);

  return (
    <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 text-xs text-slate-300">
              {categoryLabels[change.category]}
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                changeTypeStyles[change.changeType]
              }`}
            >
              <ChangeTypeIcon type={change.changeType} />
              {changeTypeLabels[change.changeType]}
            </span>
          </div>

          <h4 className="break-words text-sm font-semibold text-white">
            {change.title}
          </h4>
        </div>

        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium capitalize ${
            importanceStyles[change.impact]
          }`}
        >
          {change.impact} impact
        </span>
      </div>

      {change.description && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {change.description}
        </p>
      )}

      {(hasPreviousValue || hasCurrentValue) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ValueBlock label="Previous" value={change.previousValue} muted />
          <ValueBlock label="Current" value={change.currentValue} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Target className="h-3.5 w-3.5" />
          <span>
            Confidence:{" "}
            <span className="font-medium capitalize text-slate-300">
              {change.confidence}
            </span>
          </span>
        </div>

        {change.impact === "high" && (
          <div className="flex items-center gap-1.5 text-xs text-red-300">
            <ArrowUpRight className="h-3.5 w-3.5" />
            High-priority change
          </div>
        )}

        {change.impact === "low" && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowDownRight className="h-3.5 w-3.5" />
            Low-priority change
          </div>
        )}
      </div>

      {change.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {change.sources.map((source, index) => (
            <SourceLink
              key={`${source.url}-${index}`}
              source={source}
              compact
            />
          ))}
        </div>
      )}
    </article>
  );
}
