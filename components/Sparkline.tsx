"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export default function Sparkline({
  data,
  positive,
  width = 96,
  height = 32,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  if (!data || data.length === 0) return <div style={{ width, height }} />;
  const points = data.map((v, i) => ({ i, v }));
  const color = positive ? "var(--up)" : "var(--down)";
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
