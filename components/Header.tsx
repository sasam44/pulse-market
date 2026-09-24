"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import type { Asset } from "@/lib/types";

function ThemeIcon({ theme }: { theme: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {theme === "dark" ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      ) : (
        <>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </>
      )}
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function Header({
  assets,
  watchCount,
  onWatch,
  query,
  setQuery,
}: {
  assets: Asset[];
  watchCount: number;
  onWatch: (asset: Asset) => void;
  query: string;
  setQuery: (q: string) => void;
}) {
  const { theme, toggle } = useTheme();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);

  const filtered = assets
    .filter(
      (a) =>
        (a.symbol + " " + a.name).toLowerCase().includes(query.toLowerCase()),
    )
    .slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setSelected(0);
    setOpen(query.length > 0);
  }, [query]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = filtered[selected];
      if (a) select(a);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const select = (a: Asset) => {
    window.location.href = `/asset/${a.id}`;
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-4 px-4 sm:px-6 h-16">
        {/* Logo */}
        <button className="flex items-center gap-2 shrink-0" onClick={() => (window.location.href = "/")}>
          <div
            className="w-9 h-9 rounded-xl grid place-items-center text-white font-bold"
            style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", boxShadow: "0 6px 18px -6px var(--accent)" }}
          >
            PM
          </div>
          <div className="hidden sm:block leading-tight text-left">
            <div className="font-semibold tracking-tight">PulseMarkets</div>
            <div className="text-[11px]" style={{ color: "var(--text-3)" }}>
              Live · Stocks & Crypto
            </div>
          </div>
        </button>

        {/* Live badge */}
        <div
          className="hidden md:flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--up)" }}
        >
          <span className="live-dot w-2 h-2 rounded-full inline-block" style={{ background: "var(--up)" }} />
          {t.live}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md relative" ref={boxRef}>
          <div
            className="flex items-center gap-2 rounded-xl px-3 h-10"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              onFocus={() => query.length > 0 && setOpen(true)}
              placeholder={t.searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--text)" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ color: "var(--text-3)" }}>
                ✕
              </button>
            )}
          </div>

          {open && filtered.length > 0 && (
            <div
              className="absolute mt-2 w-full rounded-xl overflow-hidden z-50 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
            >
              {filtered.map((a, i) => (
                <button
                  key={a.id}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => select(a)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors"
                  style={{ background: i === selected ? "var(--surface-2)" : "transparent" }}
                >
                  {a.type === "crypto" && a.image ? (
                    <img src={a.image} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold text-white" style={{ background: a.type === "stock" ? "var(--accent-2)" : "var(--accent)" }}>
                      {a.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.symbol}</div>
                    <div className="truncate text-xs" style={{ color: "var(--text-3)" }}>
                      {a.name}
                    </div>
                  </div>
                  <span className="mono text-xs">{fmtPriceShort(a)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onWatch(a);
                    }}
                    className="p-1 rounded hover:opacity-70"
                    style={{ color: "var(--text-3)" }}
                  >
                    <StarIcon />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Watch icon */}
          <button
            onClick={() => (window.location.href = "/watchlist")}
            className="relative flex items-center gap-2 rounded-xl px-3 h-10 text-sm font-medium transition-colors hover:opacity-80"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            title={t.watchlist}
          >
            <StarIcon />
            <span className="hidden sm:inline">{t.watchlist}</span>
            {watchCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[11px] font-bold text-white" style={{ background: "var(--accent)" }}>
                {watchCount}
              </span>
            )}
          </button>

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="rounded-xl w-10 h-10 grid place-items-center transition-colors hover:opacity-80"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
            title={t.toggleTheme}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function fmtPriceShort(a: Asset): string {
  const n = a.price;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1000) s = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  else if (abs >= 1) s = n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  else s = n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return `$${s}`;
}
