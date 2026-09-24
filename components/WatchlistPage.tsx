"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import AssetLogo from "@/components/AssetLogo";
import Sparkline from "@/components/Sparkline";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtPrice, fmtPct, fmtCompact, directionClass } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import type { Asset } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function WatchlistPage() {
  const { watchlist, toggle } = useWatchlist();
  const { t } = useLang();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/assets", { cache: "no-store" });
      const data = await res.json();
      if (data.assets) setAssets(data.assets);
    };
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const watchedAssets = assets.filter((a) => watchlist.includes(a.id));

  return (
    <div className="min-h-screen flex flex-col">
      <Header assets={assets} watchCount={watchlist.length} onWatch={toggle} query={query} setQuery={setQuery} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.myWatchlist}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
              {t.watchCount(watchlist.length)}
            </p>
          </div>
          <button className="px-3 h-10 rounded-xl text-sm font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }} onClick={() => (window.location.href = "/")}>
            {t.addAssets}
          </button>
        </div>

        {watchedAssets.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">♛</div>
            <div className="font-semibold text-lg mb-1">{t.emptyTitle}</div>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {t.emptyBody}
            </p>
            <button className="mt-4 px-4 h-10 rounded-xl text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))" }} onClick={() => (window.location.href = "/")}>
              {t.browseMarkets}
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-3)" }}>
                    <th className="text-left font-medium px-5 py-3">{t.colAsset}</th>
                    <th className="text-right font-medium px-5 py-3">{t.colPrice}</th>
                    <th className="text-right font-medium px-5 py-3 hidden sm:table-cell">{t.colChange}</th>
                    <th className="text-right font-medium px-5 py-3 hidden md:table-cell">{t.colMarketCap}</th>
                    <th className="text-right font-medium px-5 py-3 hidden lg:table-cell">{t.colTrend}</th>
                    <th className="text-center font-medium px-5 py-3">{t.remove}</th>
                  </tr>
                </thead>
                <tbody>
                  {watchedAssets.map((a) => (
                    <tr key={a.id} className="border-t cursor-pointer hover:opacity-90" style={{ borderColor: "var(--border)" }} onClick={() => router.push(`/asset/${a.id}`)}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <AssetLogo asset={a} />
                          <div>
                            <div className="font-medium">{a.symbol}</div>
                            <div className="text-xs" style={{ color: "var(--text-3)" }}>{a.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right mono font-medium">{fmtPrice(a.price)}</td>
                      <td className={`px-5 py-3 text-right font-medium hidden sm:table-cell ${directionClass(a.priceChangePct24h)}`}>{fmtPct(a.priceChangePct24h)}</td>
                      <td className="px-5 py-3 text-right mono hidden md:table-cell" style={{ color: "var(--text-2)" }}>{fmtCompact(a.marketCap)}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <div className="flex justify-end">
                          <Sparkline data={a.sparkline ?? []} positive={a.priceChangePct24h >= 0} width={80} height={28} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(a);
                          }}
                          className="p-1.5 rounded-lg hover:opacity-70"
                          style={{ color: "var(--text-3)" }}
                          title={t.remove}
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}
