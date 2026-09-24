// Real-time crypto data via the public CoinGecko API (no key required for
// the free tier endpoints used here). Includes top-20 coins by market cap and
// historical OHLC / market-chart data with time-range mapping.
import type { Asset, CandlePoint, TimeRange } from "./types";

const COINGECKO = "https://api.coingecko.com/api/v3";

const COIN_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "ripple",
  "solana", "usd-coin", "cardano", "dogecoin", "tron",
  "avalanche-2", "chainlink", "sui", "polkadot", "the-open-network",
  "stellar", "shiba-inu", "litecoin", "bitcoin-cash", "uniswap",
];

const DAYS_MAP: Record<TimeRange, string> = {
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "3M": "90",
  "1Y": "365",
  ALL: "max",
};

type CoinGeoMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
  last_updated: string;
};

let cache: { data: Asset[]; fetchedAt: number } | null = null;
const CACHE_TTL = 8000; // 8s

export async function getCryptoAssets(force = false): Promise<Asset[]> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }
  const url = `${COINGECKO}/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url, { next: { revalidate: 4 } });
  if (!res.ok) throw new Error(`CoinGecko markets error ${res.status}`);
  const raw: CoinGeoMarket[] = await res.json();
  const assets: Asset[] = raw.map((c) => ({
    id: `crypto-${c.id}`,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    type: "crypto",
    image: c.image,
    price: c.current_price,
    priceChange24h: c.price_change_24h,
    priceChangePct24h: c.price_change_percentage_24h ?? 0,
    high24h: c.high_24h,
    low24h: c.low_24h,
    totalVolume: c.total_volume,
    marketCap: c.market_cap,
    rank: c.market_cap_rank,
    sparkline: c.sparkline_in_7d?.price ?? [],
    lastUpdated: c.last_updated,
  }));
  cache = { data: assets, fetchedAt: Date.now() };
  return assets;
}

// Historical market chart -> unified candle list.
export async function getCryptoCandles(coinId: string, range: TimeRange): Promise<CandlePoint[]> {
  const days = DAYS_MAP[range];
  const interval =
    range === "1D" ? "hourly" : range === "1W" || range === "1M" ? "daily" : "daily";
  const url = `${COINGECKO}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`CoinGecko chart error ${res.status}`);
  const data = await res.json();
  const prices: number[][] = data.prices ?? [];
  const volumes: number[][] = data.total_volumes ?? [];
  const candles: CandlePoint[] = [];
  for (let i = 0; i < prices.length; i++) {
    const [time, price] = prices[i];
    const volume = volumes[i]?.[1] ?? 0;
    candles.push({
      time,
      open: price,
      high: price,
      low: price,
      close: price,
      volume,
    });
  }
  return buildCandles(candles);
}

// Convert raw price points into OHLC buckets for proper candlesticks.
function buildCandles(pts: CandlePoint[]): CandlePoint[] {
  if (pts.length === 0) return [];
  const out: CandlePoint[] = [];
  const bucket = Math.max(1, Math.floor(pts.length / 120));
  for (let i = 0; i < pts.length; i += bucket) {
    const slice = pts.slice(i, i + bucket);
    let open = slice[0].open;
    let close = slice[slice.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let vol = 0;
    for (const p of slice) {
      high = Math.max(high, p.high);
      low = Math.min(low, p.low);
      vol += p.volume;
    }
    out.push({ time: slice[0].time, open, high, low, close, volume: vol });
  }
  return out;
}
