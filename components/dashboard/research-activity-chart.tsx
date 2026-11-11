"use client";

import { useMemo, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type ActivityData = {
  date: string;
  total: number;
};

type Range = 7 | 30;

export default function ResearchActivityChart({
  data,
}: {
  data: ActivityData[];
}) {
  const [range, setRange] = useState<Range>(30);

  const formattedData = useMemo(() => {
    const activityMap = new Map(data.map((item) => [item.date, item.total]));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: range }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (range - 1) + index);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      const dateKey = `${year}-${month}-${day}`;

      return {
        date: dateKey,
        dateLabel: date.toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        total: activityMap.get(dateKey) ?? 0,
      };
    });
  }, [data, range]);

  if (data.length === 0) {
    return (
      <div className="flex h-75 items-center justify-center text-sm text-slate-500">
        No research activity available yet.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">Daily research requests</p>

        <div className="flex gap-2">
          {([7, 30] as const).map((days) => (
            <button
              key={days}
              onClick={() => setRange(days)}
              aria-pressed={range === days}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                range === days
                  ? "bg-blue-600 text-white"
                  : "border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              stroke="#263449"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="dateLabel"
              stroke="#94A3B8"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval={range === 7 ? 0 : "preserveStartEnd"}
            />

            <YAxis
              allowDecimals={false}
              stroke="#94A3B8"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />

            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
              formatter={(value) => [
                `${value ?? 0} requests`,
                "Research activity",
              ]}
              contentStyle={{
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#FFFFFF",
              }}
            />

            <Line
              type="monotone"
              dataKey="total"
              name="Research requests"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ r: 3, fill: "#3B82F6" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
