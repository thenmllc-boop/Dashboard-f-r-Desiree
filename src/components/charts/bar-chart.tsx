"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = Record<string, number | string>;

export function BarChartCard({
  data,
  xKey,
  yKey,
  color = "#7FAF9B",
  height = 240,
  layout = "horizontal",
}: {
  data: Point[];
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={layout} margin={{ top: 10, right: 16, left: layout === "vertical" ? 50 : -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E1D6" vertical={false} />
        {layout === "horizontal" ? (
          <>
            <XAxis dataKey={xKey} stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis type="number" stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis dataKey={xKey} type="category" stroke="#6B7A72" fontSize={11} tickLine={false} axisLine={false} width={80} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "#EFEBE0" }}
          contentStyle={{ background: "#fff", border: "1px solid #E6E1D6", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#1F3D34", fontWeight: 600 }}
        />
        <Bar dataKey={yKey} fill={color} radius={[8, 8, 8, 8]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
