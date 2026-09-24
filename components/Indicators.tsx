"use client";

import type { IndicatorSnapshot, Prediction } from "@/lib/types";
import { fmtPrice } from "@/lib/format";
import { useLang } from "@/lib/i18n";

function Gauge({ value, label, sub }: { value: number; label: string; sub?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = value >= 70 ? "var(--down)" : value <= 30 ? "var(--up)" : "var(--accent)";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 80 80" className="w-16 h-16 -rotate-90">
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--surface-3)" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 201} 201`}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center mono text-sm font-semibold">{Math.round(value)}</div>
      </div>
      <div className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
        {label}
        {sub && (
          <div className="text-[10px] text-center" style={{ color: "var(--text-3)" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
        {label}
      </span>
      <span className="mono text-sm font-medium" style={{ color: color ?? "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

export default function Indicators({ ind }: { ind: IndicatorSnapshot }) {
  const { t } = useLang();
  const rsiSignal =
    ind.rsi >= 70 ? t.overbought : ind.rsi <= 30 ? t.oversold : t.neutral;
  const macdBullish = ind.macdHistogram >= 0;

  return (
    <div className="card p-4 sm:p-5 space-y-5">
      <h3 className="font-semibold text-sm">{t.techIndicators}</h3>

      <div className="flex items-center justify-around">
        <Gauge value={ind.rsi} label={t.rsiSignal} sub={rsiSignal} />
        <div className="flex flex-col items-center gap-1">
          <div
            className={`text-2xl font-bold ${macdBullish ? "text-up" : "text-down"}`}
          >
            {macdBullish ? "▲" : "▼"}
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
            {macdBullish ? t.macdBullish : t.macdBearish}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <Metric label="MACD" value={ind.macd.toFixed(3)} />
        <Metric label="Signal" value={ind.macdSignal.toFixed(3)} />
        <Metric label="Histogram" value={ind.macdHistogram.toFixed(3)} color={macdBullish ? "var(--up)" : "var(--down)"} />
        <Metric label="SMA 20" value={fmtPrice(ind.sma20)} />
        <Metric label="SMA 50" value={fmtPrice(ind.sma50)} />
        <Metric label="Volume (20)" value={`${(ind.volumeSma20 / 1e6).toFixed(1)}M`} />
      </div>

      <div className="pt-2 border-t space-y-1.5" style={{ borderColor: "var(--border)" }}>
        <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
          {t.bollinger}
        </div>
        <Metric label={t.upperBand} value={fmtPrice(ind.bollinger.upper)} color="var(--text-2)" />
        <Metric label={t.middleBand} value={fmtPrice(ind.bollinger.middle)} />
        <Metric label={t.lowerBand} value={fmtPrice(ind.bollinger.lower)} color="var(--text-2)" />
      </div>
    </div>
  );
}
