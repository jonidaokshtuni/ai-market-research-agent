"use client";

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

export default function ResearchActivityChart({
  data,
}: {
  data: ActivityData[];
}) {
  const formattedData = data.map((item) => ({
    ...item,
    date: new Date(`${item.date}T00:00:00`).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
        No research activity available yet.
      </div>
    );
  }

  return (
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
            dataKey="date"
            stroke="#94A3B8"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            allowDecimals={false}
            stroke="#94A3B8"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />

          <Tooltip
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
  );
}
