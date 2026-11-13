"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Competitor } from "./types";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Tooltip from "@/components/ui/tooltip";

type CompetitorCardProps = {
  competitor: Competitor;
  onEdit: (competitor: Competitor) => void;
  onDelete: (competitor: Competitor) => void;
  isDeleting?: boolean;
};

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: "blue" | "violet";
}) {
  const safeScore = Number.isFinite(score)
    ? Math.min(100, Math.max(0, score))
    : 0;

  const barColor = color === "blue" ? "bg-blue-500" : "bg-violet-500";
  const textColor = color === "blue" ? "text-blue-400" : "text-violet-400";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
          {safeScore}/100
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuenow={safeScore}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${safeScore}%` }}
        />
      </div>
    </div>
  );
}

function InfoSection({
  title,
  content,
  color,
}: {
  title: string;
  content: string | null;
  color: "emerald" | "rose";
}) {
  if (!content?.trim()) return null;

  const styles =
    color === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : "border-rose-500/20 bg-rose-500/5";

  const headingColor =
    color === "emerald" ? "text-emerald-400" : "text-rose-400";

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <h4
        className={`mb-2 text-xs font-semibold uppercase tracking-wider ${headingColor}`}
      >
        {title}
      </h4>

      <p className="whitespace-pre-line wrap-break-word text-sm leading-6 text-slate-300">
        {content}
      </p>
    </div>
  );
}

export default function CompetitorCard({
  competitor,
  onEdit,
  onDelete,
  isDeleting = false,
}: CompetitorCardProps) {
  const safeWebsite = useMemo(() => {
    if (!competitor.website) return null;

    try {
      const url = new URL(competitor.website);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }

      return url.toString();
    } catch {
      return null;
    }
  }, [competitor.website]);

  return (
    <article
      aria-busy={isDeleting}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 transition duration-200 hover:border-slate-700 hover:shadow-xl hover:shadow-black/10"
    >
      <div className="flex-1 space-y-5 p-5 sm:p-6">
        {/* Company header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-lg font-bold text-blue-400">
              {competitor.name.trim().charAt(0).toUpperCase() || "?"}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">
                {competitor.name}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {competitor.industry || "Industry not specified"}
              </p>
            </div>
          </div>

          <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-400">
            Competitor
          </span>
        </div>

        {/* Website */}
        {safeWebsite && (
          <a
            href={safeWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300"
          >
            <span className="truncate">{competitor.website}</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}

        {/* Description */}
        {competitor.description && (
          <p className="line-clamp-3 break-words text-sm leading-6 text-slate-400">
            {competitor.description}
          </p>
        )}

        {/* Products */}
        {competitor.products && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Products & services
            </h4>

            <p className="line-clamp-2 break-words text-sm text-slate-300">
              {competitor.products}
            </p>
          </div>
        )}

        {/* Competitive scores */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Competitive positioning
          </h4>

          <ScoreBar
            label="Market strength"
            score={competitor.marketStrength}
            color="blue"
          />

          <ScoreBar
            label="Innovation"
            score={competitor.innovationScore}
            color="violet"
          />
        </div>

        {/* SWOT */}
        {(competitor.strengths || competitor.weaknesses) && (
          <div className="grid grid-cols-1 gap-3">
            <InfoSection
              title="Strengths"
              content={competitor.strengths}
              color="emerald"
            />

            <InfoSection
              title="Weaknesses"
              content={competitor.weaknesses}
              color="rose"
            />
          </div>
        )}

        {/* Pricing */}
        {competitor.pricing && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pricing strategy
            </h4>

            <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-300">
              {competitor.pricing}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/30 p-4">
        <Tooltip content="View the complete competitor profile and its details">
          <Link
            href={`/dashboard/competitors/${competitor.id}`}
            aria-label={`View ${competitor.name} profile`}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 transition hover:border-blue-500/40 hover:bg-blue-500/20 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Eye className="size-4" aria-hidden="true" />
          </Link>
        </Tooltip>

        <div className="flex items-center gap-2">
          <Tooltip content="Edit this competitor's information, products, pricing, and scores">
            <button
              type="button"
              onClick={() => onEdit(competitor)}
              disabled={isDeleting}
              aria-label={`Edit ${competitor.name}`}
              className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>

          {competitor.canDelete && (
            <Tooltip content="Permanently remove this competitor from the workspace">
              <button
                type="button"
                onClick={() => onDelete(competitor)}
                disabled={isDeleting}
                aria-label={`Delete ${competitor.name}`}
                className="inline-flex size-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                {isDeleting ? (
                  <span
                    role="status"
                    aria-label="Deleting competitor"
                    className="size-4 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-400"
                  />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  );
}
