// Aggregates crypto + stock assets and candles for the API layer.
import { getCryptoAssets } from "./coinGecko";
import { getStockQuotes, stockToAsset, generateStockCandles } from "./stocks";
import { getCryptoCandles } from "./coinGecko";
import { generateFallbackCandles } from "./ai";
import type { Asset, CandlePoint, TimeRange } from "./types";

let stockAssetsCache: Asset[] | null = null;
let stockCacheAt = 0;

export async function getAllAssets(): Promise<Asset[]> {
  let crypto: Asset[] = [];
  try {
    crypto = await getCryptoAssets();
  } catch (e) {
    console.warn("Crypto fetch failed", e);
  }
  // Refresh stock quotes every ~10s
  let stocks: Asset[] = [];
  if (!stockAssetsCache || Date.now() - stockCacheAt > 10000) {
    const quotes = await getStockQuotes();
    stocks = quotes.map((q, i) => stockToAsset(q, i + 1));
    stockAssetsCache = stocks;
    stockCacheAt = Date.now();
  } else {
    stocks = stockAssetsCache;
  }
  return [...stocks, ...crypto];
}

export async function getCandles(asset: Asset, range: TimeRange): Promise<CandlePoint[]> {
  if (asset.type === "crypto") {
    const coinId = asset.id.replace(/^crypto-/, "");
    try {
      return await getCryptoCandles(coinId, range);
    } catch (e) {
      console.warn("Candle fetch failed, generating fallback", e);
      return generateFallbackCandles(asset);
    }
  }
  // stock
  const quote = (await getStockQuotes()).find((q) => q.symbol === asset.symbol);
  if (quote) {
    return generateStockCandles(quote, range);
  }
  return generateFallbackCandles(asset);
}

export function findAsset(all: Asset[], idOrSymbol: string): Asset | undefined {
  const key = idOrSymbol.toLowerCase().trim();
  return all.find((a) => a.id === key || a.symbol.toLowerCase() === key.replace(/^crypto-/, ""));
}
