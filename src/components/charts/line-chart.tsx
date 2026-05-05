"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = Record<string, number | string>;

export function LineChartCard({
  data,
  xKey,
  yKeys,
  colors = ["#1F3D34", "#7FAF9B", "#C6A76D"],
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
      <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D6" vertical={false} />
        <XAxis dataKey={xKey} stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#fff", border: "1px solid #E6E1D6", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#1F3D34", fontWeight: 600 }}
        />
        {yKeys.map((k, i) => (
          <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2.5} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
