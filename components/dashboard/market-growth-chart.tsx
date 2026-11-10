"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", market: 120, forecast: 125 },
  { month: "Feb", market: 135, forecast: 140 },
  { month: "Mar", market: 128, forecast: 145 },
  { month: "Apr", market: 155, forecast: 160 },
  { month: "May", market: 170, forecast: 175 },
  { month: "Jun", market: 185, forecast: 195 },
  { month: "Jul", market: 200, forecast: 215 },
  { month: "Aug", market: 220, forecast: 235 },
];

export default function MarketGrowthChart() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Market Growth</h2>
          <p className="mt-1 text-sm text-slate-400">
            Market size and projected growth
          </p>
        </div>
        <span className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
          Illustrative data
        </span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="marketGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#263449" strokeDasharray="3 3" />

            <XAxis
              dataKey="month"
              stroke="#94A3B8"
              tickLine={false}
              axisLine={false}
            />

            <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} />

            <Tooltip
              contentStyle={{
                backgroundColor: "#0F172A",
                border: "1px solid #334155",
                borderRadius: "12px",
                color: "#FFFFFF",
              }}
            />

            <Area
              type="monotone"
              dataKey="market"
              stroke="#3B82F6"
              strokeWidth={3}
              fill="url(#marketGradient)"
              name="Market size"
            />

            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#A78BFA"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
