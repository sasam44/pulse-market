"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import AssetLogo from "@/components/AssetLogo";
import Sparkline from "@/components/Sparkline";
import NewsPanel from "@/components/NewsPanel";
import { useWatchlist } from "@/components/useWatchlist";
import { INDEXES } from "@/lib/stocks";
import { fmtPrice, fmtPct, fmtCompact, directionClass } from "@/lib/format";
import { useLang, type Translation } from "@/lib/i18n";
import type { Asset } from "@/lib/types";
import { useRouter } from "next/navigation";

type Tab = "all" | "stocks" | "crypto" | "gainers" | "losers";

const INDEX_META: Record<string, { color: string }> = {
  SPX: { color: "#4f6ef7" },
  NDX: { color: "#7b5cf0" },
  DJI: { color: "#0ea5e9" },
  VIX: { color: "#f59e0b" },
};

export default function Dashboard() {
  const { watchlist, toggle, isWatched } = useWatchlist();
  const { t } = useLang();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const router = useRouter();


  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json();
      if (data.assets) setAssets(data.assets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    // Poll every 8s for near real-time updates
    const id = setInterval(fetchAssets, 8000);
    return () => clearInterval(id);
  }, [fetchAssets]);


  const filterAssets = (): Asset[] => {
    let list = assets;
    if (tab === "stocks") list = assets.filter((a) => a.type === "stock");
    else if (tab === "crypto") list = assets.filter((a) => a.type === "crypto");
    else if (tab === "gainers")
      list = [...assets].sort((a, b) => b.priceChangePct24h - a.priceChangePct24h);
    else if (tab === "losers")
      list = [...assets].sort((a, b) => a.priceChangePct24h - b.priceChangePct24h);
    if (query) {
      list = list.filter((a) =>
        (a.symbol + " " + a.name).toLowerCase().includes(query.toLowerCase()),
      );
    }
    // order: crypto by market cap first, then stocks
    if (tab === "all" || tab === "crypto") {
      list = [...list].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
    }
    return list;
  };

  const shown = filterAssets();

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t.tabAll },
    { id: "stocks", label: t.tabStocks },
    { id: "crypto", label: t.tabCrypto },
    { id: "gainers", label: t.tabGainers },
    { id: "losers", label: t.tabLosers },
  ];

  const indexName = (symbol: string, t: Translation): string => {
    switch (symbol) {
      case "SPX": return t.ixSp500;
      case "NDX": return t.ixNasdaq;
      case "DJI": return t.ixDow;
      default: return "VIX";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header assets={assets} watchCount={watchlist.length} onWatch={toggle} query={query} setQuery={setQuery} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Index strip */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {INDEXES.map((ix) => {
            const meta = INDEX_META[ix.symbol];
            const up = ix.changePct >= 0;
            return (
              <div key={ix.symbol} className="card p-4 animate-fade-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--text-3)" }}>
                    {indexName(ix.symbol, t)}
                  </span>
                  <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                </div>
                <div className="mono text-xl font-semibold mt-1">{ix.value.toLocaleString()}</div>
                <div className={`text-xs font-medium mt-1 ${up ? "text-up" : "text-down"}`}>
                  {up ? "▲" : "▼"} {fmtPct(ix.changePct)}
                </div>
              </div>
            );
          })}
        </section>

        {/* Asset table card */}
        <section className="card overflow-hidden animate-fade-up">
          <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold text-base mr-2">{t.markets}</h2>
            <div className="flex gap-1 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: tab === t.id ? "var(--accent)" : "var(--surface-2)",
                    color: tab === t.id ? "#fff" : "var(--text-2)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs mono" style={{ color: "var(--text-3)" }}>
              {t.assetsCount(assets.length)}
            </span>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-3)" }}>
                    <th className="text-left font-medium px-5 py-3">{t.colAsset}</th>
                    <th className="text-right font-medium px-5 py-3">{t.colPrice}</th>
                    <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">{t.colChange}</th>
                    <th className="text-right font-medium px-5 py-3 hidden md:table-cell">{t.colMarketCap}</th>
                    <th className="text-right font-medium px-5 py-3 hidden lg:table-cell">{t.colVolume}</th>
                    <th className="text-right font-medium px-5 py-3 hidden lg:table-cell">{t.colTrend}</th>
                    <th className="text-center font-medium px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((a) => (
                    <tr
                      key={a.id}
                      className="cursor-pointer border-t transition-colors hover:opacity-90"
                      style={{ borderColor: "var(--border)" }}
                      onClick={() => router.push(`/asset/${a.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <AssetLogo asset={a} />
                          <div>
                            <div className="font-medium flex items-center gap-1.5">
                              {a.symbol}
                              <span
                                className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                                style={{
                                  color: "var(--text-3)",
                                  border: "1px solid var(--border)",
                                }}
                              >
                                {a.type === "crypto" ? t.typeCrypto : t.typeStock}
                              </span>
                            </div>
                            <div className="text-xs" style={{ color: "var(--text-3)" }}>
                              {a.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right mono font-medium">{fmtPrice(a.price)}</td>
                      <td className={`px-5 py-3 text-right font-medium hidden sm:table-cell ${directionClass(a.priceChangePct24h)}`}>
                        {fmtPct(a.priceChangePct24h)}
                      </td>
                      <td className="px-5 py-3 text-right mono hidden md:table-cell" style={{ color: "var(--text-2)" }}>
                        {fmtCompact(a.marketCap)}
                      </td>
                      <td className="px-5 py-3 text-right mono hidden lg:table-cell" style={{ color: "var(--text-2)" }}>
                        {fmtCompact(a.totalVolume)}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex justify-end">
                          <Sparkline
                            data={a.sparkline ?? []}
                            positive={a.priceChangePct24h >= 0}
                            width={90}
                            height={30}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(a);
                          }}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                          style={{
                            color: isWatched(a.id) ? "var(--accent)" : "var(--text-3)",
                          }}
                          title={isWatched(a.id) ? t.removeWatch : t.addWatch}
                        >
                          <Star fill={isWatched(a.id)} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-3)" }}>
                        {t.noResults}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Market news */}
        <NewsPanel />

        <footer className="text-center text-xs py-6" style={{ color: "var(--text-3)" }}>
          PulseMarkets · {t.footer}
        </footer>
      </main>
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

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg" style={{ background: "var(--surface-2)" }} />
      ))}
    </div>
  );
}
