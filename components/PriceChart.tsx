"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { CandlePoint, Prediction, TimeRange } from "@/lib/types";
import { fmtPrice, fmtTime, fmtDate } from "@/lib/format";
import { useLang } from "@/lib/i18n";

const RANGES: TimeRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CandlePoint;
  const up = d.close >= d.open;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div className="font-medium mb-1" style={{ color: "var(--text-3)" }}>
        {fmtDate(d.time)} · {fmtTime(d.time)}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mono">
        <span style={{ color: "var(--text-3)" }}>Open</span>
        <span>{fmtPrice(d.open)}</span>
        <span style={{ color: "var(--text-3)" }}>High</span>
        <span className="text-up">{fmtPrice(d.high)}</span>
        <span style={{ color: "var(--text-3)" }}>Low</span>
        <span className="text-down">{fmtPrice(d.low)}</span>
        <span style={{ color: "var(--text-3)" }}>Close</span>
        <span style={{ color: up ? "var(--up)" : "var(--down)" }}>{fmtPrice(d.close)}</span>
      </div>
    </div>
  );
}

export default function PriceChart({
  candles,
  range,
  setRange,
  prediction,
}: {
  candles: CandlePoint[];
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  prediction?: Prediction | null;
}) {
  const data = candles.map((c) => ({
    ...c,
    t: new Date(c.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  }));
  const { t } = useLang();

  // Build prediction extension points
  let predPoints: any[] = [];
  if (prediction && candles.length) {
    const lastClose = candles[candles.length - 1].close;
    const lastTime = candles[candles.length - 1].time;
    const step = Math.max(lastTime - candles[candles.length - 2]?.time, 3600e3);
    predPoints = [
      { t: "Forecast", time: lastTime, close: lastClose, forecast: null },
      { t: "+1h", time: lastTime + step, close: null, forecast: prediction.predictedPrice },
    ];
  }

  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high), ...predPoints.map((p) => p.forecast ?? 0));
  const isUp = candles.length >= 2 && candles[candles.length - 1].close >= candles[0].open;
  const lineColor = isUp ? "var(--up)" : "var(--down)";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1 pb-2 flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: range === r ? "var(--accent)" : "var(--surface-2)",
                color: range === r ? "#fff" : "var(--text-2)",
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {prediction && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--surface-2)", color: "var(--accent-2)" }}>
            {t.aiForecast} · {prediction.model}
          </span>
        )}
      </div>

      <div className="h-[340px] sm:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...data, ...predPoints]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={40}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "var(--text-3)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              orientation="right"
              width={70}
              tickFormatter={(v) => fmtPrice(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            {prediction && (
              <ReferenceLine
                y={prediction.predictedPrice}
                stroke="var(--accent-2)"
                strokeDasharray="4 4"
                label={{ value: t.aiTarget, position: "insideTopRight", fill: "var(--accent-2)", fontSize: 11 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="close"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            {prediction && (
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="var(--accent-2)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
