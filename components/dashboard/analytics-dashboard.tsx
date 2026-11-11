"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ActivityDay = {
  date: string;
  requests: number;
  reports: number;
  sources: number;
};

type AnalyticsResponse = {
  activity: ActivityDay[];
  totals: {
    requests: number;
    reports: number;
    sources: number;
    sessions: number;
  };
  period: {
    start: string;
    end: string;
    days: number;
  };
};

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - (days - 1));

  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
  };
}

function fillMissingDays(activity: ActivityDay[], start: string, end: string) {
  const values = new Map(activity.map((item) => [item.date, item]));
  const result: ActivityDay[] = [];

  const current = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  while (current <= last) {
    const date = toLocalDateString(current);

    result.push(
      values.get(date) ?? {
        date,
        requests: 0,
        reports: 0,
        sources: 0,
      }
    );

    current.setDate(current.getDate() + 1);
  }

  return result;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">
        {value.toLocaleString()}
      </p>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}

const chartCardClass = "rounded-2xl border border-slate-800 bg-slate-900 p-5";

const chartStyle = {
  backgroundColor: "#0F172A",
  border: "1px solid #334155",
  borderRadius: "12px",
  color: "#FFFFFF",
};

export default function AnalyticsDashboard() {
  const initialRange = getDateRange(30);

  const [start, setStart] = useState(initialRange.start);
  const [end, setEnd] = useState(initialRange.end);
  const [preset, setPreset] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/dashboard/analytics?start=${start}&end=${end}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load analytics.");
        }

        setAnalytics(result);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => controller.abort();
  }, [start, end]);

  function applyPreset(days: number) {
    const range = getDateRange(days);

    setPreset(String(days));
    setStart(range.start);
    setEnd(range.end);
  }

  function applyCustomRange() {
    setPreset("custom");

    if (start && end && start <= end) {
      setStart(start);
      setEnd(end);
    }
  }

  const chartData = analytics
    ? fillMissingDays(analytics.activity, start, end).map((item) => ({
        ...item,
        label: formatDate(item.date),
      }))
    : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Analytics overview
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Explore your research performance over time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "7 days", value: 7 },
            { label: "30 days", value: 30 },
            { label: "90 days", value: 90 },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => applyPreset(item.value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                preset === String(item.value)
                  ? "bg-blue-600 text-white"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-xs text-slate-400">
            Start date
          </label>
          <input
            type="date"
            value={start}
            max={end}
            onChange={(event) => {
              setStart(event.target.value);
              setPreset("custom");
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex-1">
          <label className="mb-2 block text-xs text-slate-400">End date</label>
          <input
            type="date"
            value={end}
            min={start}
            max={toLocalDateString(new Date())}
            onChange={(event) => {
              setEnd(event.target.value);
              setPreset("custom");
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>

        <button
          onClick={applyCustomRange}
          disabled={!start || !end || start > end}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply dates
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Research requests"
          value={analytics?.totals.requests ?? 0}
          description="User research messages"
        />
        <MetricCard
          title="Reports generated"
          value={analytics?.totals.reports ?? 0}
          description="Reports saved in this period"
        />
        <MetricCard
          title="Sources collected"
          value={analytics?.totals.sources ?? 0}
          description="Source references collected"
        />
        <MetricCard
          title="Active sessions"
          value={analytics?.totals.sessions ?? 0}
          description="Sessions with activity in this period"
        />
      </section>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          Updating analytics...
        </div>
      )}

      <section className={chartCardClass}>
        <div className="mb-5">
          <h3 className="font-semibold text-white">Research activity</h3>
          <p className="mt-1 text-sm text-slate-400">
            Number of research requests per day.
          </p>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#263449" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                stroke="#94A3B8"
                tickLine={false}
                axisLine={false}
                minTickGap={25}
              />
              <YAxis
                allowDecimals={false}
                stroke="#94A3B8"
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip contentStyle={chartStyle} />
              <Line
                type="monotone"
                dataKey="requests"
                name="Research requests"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className={chartCardClass}>
          <h3 className="font-semibold text-white">Reports generated</h3>
          <p className="mt-1 text-sm text-slate-400">
            Reports created per day.
          </p>

          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#263449" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={25}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip contentStyle={chartStyle} />
                <Bar
                  dataKey="reports"
                  name="Reports"
                  fill="#A78BFA"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartCardClass}>
          <h3 className="font-semibold text-white">Sources collected</h3>
          <p className="mt-1 text-sm text-slate-400">
            Source references collected per day.
          </p>

          <div className="mt-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid stroke="#263449" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={25}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip contentStyle={chartStyle} />
                <Area
                  type="monotone"
                  dataKey="sources"
                  name="Sources"
                  stroke="#34D399"
                  fill="#34D399"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {analytics && (
        <p className="text-xs text-slate-500">
          Showing {analytics.period.days} days: {analytics.period.start} to{" "}
          {analytics.period.end}.
        </p>
      )}
    </div>
  );
}
