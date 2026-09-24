"use client";

import { useEffect, useState } from "react";
import type { Prediction } from "@/lib/types";
import { fmtPrice, fmtPct, directionClass } from "@/lib/format";
import { useLang, translateRationale } from "@/lib/i18n";

interface MultiHorizon {
  "1h": { price: number; confidence: number; support: number; resistance: number; changePct?: number };
  "24h": { price: number; confidence: number; support: number; resistance: number; changePct?: number };
  "7d": { price: number; confidence: number; support: number; resistance: number; changePct?: number };
}

export default function PredictionPanel({
  assetId,
  price,
}: {
  assetId: string;
  price: number;
}) {
  const { t } = useLang();
  const [multi, setMulti] = useState<MultiHorizon | null>(null);
  const [base, setBase] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`/api/predict?id=${assetId}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.prediction) {
          const p = data.prediction;
          setBase(p);
          // Reconstruct multi-horizon using available prediction ratios
          setMulti({
            "1h": { price: p["1h"]?.price ?? price, confidence: p["1h"]?.confidence ?? p.confidence, support: p["1h"]?.support ?? p.levels.support, resistance: p["1h"]?.resistance ?? p.levels.resistance },
            "24h": { price: p["24h"]?.price ?? p.predictedPrice, confidence: p["24h"]?.confidence ?? p.confidence, support: p.levels.support, resistance: p.levels.resistance },
            "7d": { price: p["7d"]?.price ?? price, confidence: p["7d"]?.confidence ?? p.confidence, support: p["7d"]?.support ?? p.levels.support, resistance: p["7d"]?.resistance ?? p.levels.resistance },
          });
        } else {
          setError(true);
        }
      } catch (e) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [assetId, price]);

  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        <div className="h-4 w-40 rounded" style={{ background: "var(--surface-2)" }} />
        <div className="h-24 rounded" style={{ background: "var(--surface-2)" }} />
        <div className="text-xs" style={{ color: "var(--text-3)" }}>
          {t.runningModel}
        </div>
      </div>
    );
  }

  if (error || !multi) {
    return (
      <div className="card p-5 text-sm" style={{ color: "var(--text-3)" }}>
        {t.predictionUnavailable}
      </div>
    );
  }

  const horizons: { key: keyof MultiHorizon; label: string; sub: string }[] = [
    { key: "1h", label: t.hour1, sub: t.hour1Sub },
    { key: "24h", label: t.hour24, sub: t.hour24Sub },
    { key: "7d", label: t.day7, sub: t.day7Sub },
  ];

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t.aiPredictions}</h3>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full uppercase" style={{ background: "var(--surface-2)", color: "var(--accent-2)" }}>
          {base?.model ?? "AI"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {horizons.map((h) => {
          const m = multi[h.key];
          const changePct = ((m.price - price) / price) * 100;
          const dir = changePct >= 0.005 ? "up" : changePct <= -0.005 ? "down" : "flat";
          return (
            <div key={h.key} className="rounded-xl p-3 text-center" style={{ background: "var(--surface-2)" }}>
              <div className="text-xs font-semibold">{h.label}</div>
              <div className="text-[10px] mb-2" style={{ color: "var(--text-3)" }}>
                {h.sub}
              </div>
              <div className="mono text-base sm:text-lg font-bold">{fmtPrice(m.price)}</div>
              <div className={`text-xs font-semibold mt-0.5 ${directionClass(changePct)}`}>
                {changePct >= 0 ? "▲" : "▼"} {fmtPct(changePct)}
              </div>
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  <div className="h-full rounded-full" style={{ width: `${m.confidence}%`, background: m.confidence >= 60 ? "var(--up)" : m.confidence >= 40 ? "var(--accent)" : "var(--down)" }} />
                </div>
                <div className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
                  {m.confidence}% {t.confidence}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
        {translateRationale(base?.rationale ?? "", t)}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="rounded-lg px-3 py-2 bg-down">
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {t.support}
          </div>
          <div className="mono text-sm font-semibold text-down">{fmtPrice(multi["24h"].support)}</div>
        </div>
        <div className="rounded-lg px-3 py-2 bg-up">
          <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {t.resistance}
          </div>
          <div className="mono text-sm font-semibold text-up">{fmtPrice(multi["24h"].resistance)}</div>
        </div>
      </div>
    </div>
  );
}
