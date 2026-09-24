"use client";

import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { NewsItem, NewsCategory } from "@/lib/types";

type Tab = "crypto" | "stocks";

function timeAgo(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (lang === "id") {
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} mnt lalu`;
    if (h < 24) return `${h} jam lalu`;
    return `${d} hari lalu`;
  }
  if (lang === "zh") {
    if (m < 1) return "刚刚";
    if (m < 60) return `${m} 分钟前`;
    if (h < 24) return `${h} 小时前`;
    return `${d} 天前`;
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const SOURCE_COLOR: Record<string, string> = {
  CoinDesk: "#f7931a",
  Cointelegraph: "#2a7de1",
  CNBC: "#f4a300",
  "Yahoo Finance": "#5f47d0",
};

export default function NewsPanel() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState<Tab>("crypto");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true);
      try {
        const res = await fetch(`/api/news?category=${tab}&limit=5${force ? "&refresh=1" : ""}`, { cache: "no-store" });
        const data = await res.json();
        if (data.news) setNews(data.news);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(() => load(), 300000); // refresh every 5 min
    return () => clearInterval(id);
  }, [load]);

  const switchTab = (tabId: Tab) => {
    setTab(tabId);
    setNews([]);
    setLoading(true);
  };

  return (
    <div className="card p-4 sm:p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{t.newsTitle}</h3>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
          </svg>
          {t.newsRefresh}
        </button>
      </div>

      <div className="flex gap-1 mb-3">
        {(["crypto", "stocks"] as Tab[]).map((id2) => (
          <button
            key={id2}
            onClick={() => switchTab(id2)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: tab === id2 ? "var(--accent)" : "var(--surface-2)",
              color: tab === id2 ? "#fff" : "var(--text-2)",
            }}
          >
            {id2 === "crypto" ? t.newsCrypto : t.newsStocks}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: "var(--text-3)" }}>
          {t.newsEmpty}
        </div>
      ) : (
        <ul className="space-y-1">
          {news.map((n, i) => (
            <li key={n.id}>
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl p-2.5 transition-colors hover:bg-opacity-50"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-1 w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold text-white"
                    style={{ background: SOURCE_COLOR[n.source] || "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium leading-snug group-hover:underline" style={{ color: "var(--text)" }}>
                      {n.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>
                      <span className="font-semibold" style={{ color: "var(--text-2)" }}>{n.source}</span>
                      <span>·</span>
                      <span>{timeAgo(n.publishedAt, lang)}</span>
                    </div>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
