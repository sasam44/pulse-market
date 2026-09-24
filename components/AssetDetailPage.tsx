"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import AssetLogo from "@/components/AssetLogo";
import PriceChart from "@/components/PriceChart";
import Indicators from "@/components/Indicators";
import PredictionPanel from "@/components/PredictionPanel";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtPrice, fmtPct, fmtCompact, fmtVolume, directionClass } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import type { Asset, AssetDetail, Prediction, TimeRange } from "@/lib/types";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { watchlist, toggle, isWatched } = useWatchlist();
  const { t } = useLang();

  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [range, setRange] = useState<TimeRange>("1W");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/asset?id=${id}&range=${range}`, { cache: "no-store" });
      const data = await res.json();
      if (data.asset) setDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Fetch prediction for the chart overlay
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/predict?id=${id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.prediction) setPrediction(data.prediction);
      } catch {
        /* ignore */
      }
    };
    load();
    const iv = setInterval(load, 90000);
    return () => clearInterval(iv);
  }, [id]);

  // Fetch all assets for header search + refresh price periodically
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json();
      if (data.assets) setAllAssets(data.assets);
    };
    load();
    const id2 = setInterval(load, 8000);
    return () => clearInterval(id2);
  }, []);

  if (!detail && loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header assets={allAssets} watchCount={watchlist.length} onWatch={toggle} query={query} setQuery={setQuery} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          <div className="h-10 w-64 rounded-lg" style={{ background: "var(--surface-2)" }} />
          <div className="h-[400px] rounded-2xl" style={{ background: "var(--surface-2)" }} />
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header assets={allAssets} watchCount={watchlist.length} onWatch={toggle} query={query} setQuery={setQuery} />
        <main className="flex-1 grid place-items-center w-full max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="text-4xl mb-2">📉</div>
            <div className="font-semibold text-lg">{t.assetNotFound}</div>
            <button className="mt-3 text-sm font-medium" style={{ color: "var(--accent)" }} onClick={() => (window.location.href = "/")}>
              ← {t.backToDashboard}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const asset = detail.asset;
  const { indicator } = detail;
  const up = asset.priceChangePct24h >= 0;
  const watched = isWatched(asset.id);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        assets={allAssets}
        watchCount={watchlist.length}
        onWatch={toggle}
        query={query}
        setQuery={setQuery}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button className="text-sm font-medium" style={{ color: "var(--text-3)" }} onClick={() => (window.location.href = "/")}>
          ← {t.backToDashboard}
        </button>

        {/* Asset header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <AssetLogo asset={asset} size={52} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
                <span className="mono text-sm px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-2)" }}>
                  {asset.symbol}
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-3)" }}>
                  {asset.type === "crypto" ? t.assetTypeCrypto : t.assetTypeStock}
                </span>
              </div>
              <div className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                {asset.type === "crypto" ? t.assetTypeCrypto : t.equity} · {t.rank(asset.rank ?? "—")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toggle(asset)}
              className="flex items-center gap-2 px-3 h-10 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{
                background: watched ? "rgba(91,124,250,0.15)" : "var(--surface-2)",
                border: "1px solid var(--border)",
                color: watched ? "var(--accent)" : "var(--text-2)",
              }}
            >
              <Star fill={watched} />
              {watched ? t.watched : t.watch}
            </button>
          </div>
        </div>

        {/* Price + change */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="mono text-4xl font-bold">{fmtPrice(asset.price)}</div>
          <span
            className={`text-lg font-semibold mb-1 px-2.5 py-0.5 rounded-lg ${up ? "bg-up text-up" : "bg-down text-down"}`}
          >
            {up ? "▲" : "▼"} {fmtPct(asset.priceChangePct24h)}
          </span>
          <span className="mb-1 text-sm" style={{ color: "var(--text-3)" }}>
            {fmtPct(asset.priceChange24h)} {t.today}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label={t.high24} value={fmtPrice(asset.high24h)} />
          <Stat label={t.low24} value={fmtPrice(asset.low24h)} />
          <Stat label={t.colMarketCap} value={fmtCompact(asset.marketCap)} />
          <Stat label={t.colVolume} value={fmtVolume(asset.totalVolume)} />
        </div>

        {/* Main grid: chart + sidebar */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-4 sm:p-5 animate-fade-up">
            <PriceChart candles={detail.candles} range={range} setRange={setRange} prediction={prediction} />
            {/* prediction for chart refetched on range change via separate call */}
          </div>

          <div className="space-y-6">
            <PredictionPanel assetId={asset.id} price={asset.price} />
            <Indicators ind={indicator} />
          </div>
        </div>

        <footer className="text-center text-xs py-6" style={{ color: "var(--text-3)" }}>
          {t.footerDetail}
        </footer>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>
        {label}
      </div>
      <div className="mono text-base sm:text-lg font-semibold">{value}</div>
    </div>
  );
}

function Star({ fill }: { fill: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
