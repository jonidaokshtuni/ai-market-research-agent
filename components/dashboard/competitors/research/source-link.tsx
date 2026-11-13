import { ExternalLink } from "lucide-react";

import type { Source } from "./types";

type SourceLinkProps = {
  source: Source;
  compact?: boolean;
};

export function SourceLink({ source, compact = false }: SourceLinkProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={
        compact
          ? "inline-flex items-center gap-1 text-xs text-blue-400 transition hover:text-blue-300"
          : "inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:border-blue-500/30 hover:text-blue-300"
      }
    >
      <span className={compact ? "" : "truncate"}>{source.title}</span>

      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}
