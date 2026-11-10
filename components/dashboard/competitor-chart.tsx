"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { company: "Company A", strength: 85, innovation: 75 },
  { company: "Company B", strength: 70, innovation: 90 },
  { company: "Company C", strength: 65, innovation: 80 },
  { company: "Company D", strength: 90, innovation: 65 },
];

export default function CompetitorChart() {
  return (
    <section className="min-w-0 w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white sm:text-lg">
          Competitor Benchmarking
        </h2>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          Comparative performance indicators
        </p>
      </div>

      <div className="h-[240px] w-full min-w-0 sm:h-[280px] lg:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={5}>
            <CartesianGrid
              stroke="#263449"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="company"
              stroke="#94A3B8"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />

            <YAxis
              stroke="#94A3B8"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={30}
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

            <Bar
              dataKey="strength"
              name="Market strength"
              fill="#3B82F6"
              radius={[5, 5, 0, 0]}
            />

            <Bar
              dataKey="innovation"
              name="Innovation"
              fill="#A78BFA"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
