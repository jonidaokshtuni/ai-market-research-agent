type CompetitorSkeletonProps = {
  count?: number;
};

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-800/80 ${className}`}
    />
  );
}

export default function CompetitorSkeleton({
  count = 6,
}: CompetitorSkeletonProps) {
  return (
    <div
      className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Loading competitors"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading competitor profiles...</span>

      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className="size-12 shrink-0 rounded-xl" />

            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-1/3" />
            </div>
          </div>

          <SkeletonBlock className="mt-5 h-3 w-1/2" />
          <SkeletonBlock className="mt-3 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-4/5" />

          <div className="mt-6 space-y-4 rounded-xl border border-slate-800 p-4">
            <SkeletonBlock className="h-3 w-2/5" />

            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-1/3" />
              <SkeletonBlock className="h-2 w-full rounded-full" />
            </div>

            <div className="space-y-2">
              <SkeletonBlock className="h-3 w-1/3" />
              <SkeletonBlock className="h-2 w-full rounded-full" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-20 rounded-xl" />
            <SkeletonBlock className="h-20 rounded-xl" />
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-800 pt-4">
            <SkeletonBlock className="h-9 w-20" />
            <SkeletonBlock className="h-9 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
