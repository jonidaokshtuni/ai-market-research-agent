"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { month: "Jan", AI: 30, Cloud: 45, Automation: 25 },
  { month: "Feb", AI: 38, Cloud: 48, Automation: 30 },
  { month: "Mar", AI: 45, Cloud: 50, Automation: 35 },
  { month: "Apr", AI: 52, Cloud: 55, Automation: 42 },
  { month: "May", AI: 65, Cloud: 58, Automation: 48 },
  { month: "Jun", AI: 75, Cloud: 63, Automation: 55 },
];

export default function IndustryTrendsChart() {
  return (
    <section className="min-w-0 w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white sm:text-lg">
        Industry Trends
      </h2>
      <p className="mt-1 text-xs text-slate-400 sm:text-sm">
        Illustrative industry interest indicators
      </p>

      <div className="mt-5 h-[240px] w-full min-w-0 sm:h-[280px] lg:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              stroke="#263449"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="month"
              stroke="#94A3B8"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />

            <YAxis
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

            <Legend wrapperStyle={{ fontSize: "12px" }} />

            <Line
              type="monotone"
              dataKey="AI"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="Cloud"
              stroke="#A78BFA"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="Automation"
              stroke="#06B6D4"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
