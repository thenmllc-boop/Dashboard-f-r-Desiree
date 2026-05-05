"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = Record<string, number | string>;

export function AreaChartCard({
  data,
  xKey,
  yKeys,
  colors = ["#7FAF9B", "#C6A76D", "#1F3D34"],
  height = 240,
}: {
  data: Point[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          {yKeys.map((k, i) => (
            <linearGradient id={`fill-${k}`} key={k} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.35} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D6" vertical={false} />
        <XAxis dataKey={xKey} stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #E6E1D6",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(31,61,52,0.08)",
            fontSize: 12,
          }}
          labelStyle={{ color: "#1F3D34", fontWeight: 600 }}
        />
        {yKeys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            fill={`url(#fill-${k})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
