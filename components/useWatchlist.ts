"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/lib/types";

const KEY = "pm-watchlist";

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setWatchlist(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (asset: Asset) => {
    setWatchlist((cur) => {
      const has = cur.includes(asset.id);
      const next = has ? cur.filter((x) => x !== asset.id) : [...cur, asset.id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isWatched = (id: string) => watchlist.includes(id);
  return { watchlist, toggle, isWatched };
}
