import CompetitorChart from "@/components/dashboard/competitor-chart";

export default function CompetitorsPage() {
  return (
    <main className="space-y-8 p-6 sm:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Competitor Analysis
        </h1>

        <p className="mt-2 text-slate-400">
          Compare competitors and explore competitive positioning.
        </p>
      </div>

      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
        <h2 className="font-semibold text-blue-400">
          Competitive Intelligence
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          This section currently displays illustrative benchmarking data. Real
          competitor comparisons will be connected to your AI research results
          in a later step.
        </p>
      </section>

      <CompetitorChart />
    </main>
  );
}
