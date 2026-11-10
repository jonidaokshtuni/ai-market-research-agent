"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { name: "Company A", value: 35 },
  { name: "Company B", value: 25 },
  { name: "Company C", value: 20 },
  { name: "Others", value: 20 },
];

const COLORS = ["#3B82F6", "#8B5CF6", "#06B6D4", "#64748B"];

export default function MarketShareChart() {
  return (
    <section className="min-w-0 w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-white sm:text-lg">
        Market Share
      </h2>
      <p className="mt-1 text-xs text-slate-400 sm:text-sm">
        Illustrative market distribution
      </p>

      <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius="48%"
              outerRadius="72%"
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip
              formatter={(value) => [`${value}%`, "Market share"]}
              contentStyle={{
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#FFFFFF",
              }}
            />

            <Legend wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
