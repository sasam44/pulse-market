// Stock data source.
//
// The app can optionally connect to a real market-data API (e.g. Alpha Vantage,
// Tiingo, Polygon.io) by setting STOCK_API_KEY and STOCK_API_BASE in the
// environment. When no API key is present, we fall back to a realistic
// simulated dataset so the dashboard remains fully functional out of the box.
//
// Real data integration:
//   STOCK_API_KEY        your provider key
//   STOCK_API_BASE       e.g. https://www.alphavantage.co/query
import type { Asset, StockQuote, CandlePoint, TimeRange } from "./types";

const STOCK_API_KEY = process.env.STOCK_API_KEY;
const STOCK_API_BASE = process.env.STOCK_API_BASE;

export const INDEXES = [
  { symbol: "SPX", name: "S&P 500", value: 5946.19, changePct: 0.42 },
  { symbol: "NDX", name: "Nasdaq 100", value: 21419.31, changePct: 0.67 },
  { symbol: "DJI", name: "Dow Jones", value: 43245.8, changePct: -0.12 },
  { symbol: "VIX", name: "VIX", value: 13.42, changePct: -3.4 },
];

// Representative universe of top global stocks (symbol, name, base price).
// Prices are seeded and evolve each refresh to simulate a live feed.
const STOCK_UNIVERSE: Array<[string, string, number]> = [
  ["AAPL", "Apple Inc.", 229.87],
  ["MSFT", "Microsoft", 437.11],
  ["NVDA", "NVIDIA", 141.54],
  ["GOOGL", "Alphabet (Class A)", 176.42],
  ["AMZN", "Amazon.com", 201.32],
  ["META", "Meta Platforms", 588.64],
  ["TSLA", "Tesla", 248.71],
  ["AVGO", "Broadcom", 178.92],
  ["BRK.B", "Berkshire Hathaway", 462.03],
  ["LLY", "Eli Lilly", 781.2],
  ["JPM", "JPMorgan Chase", 231.44],
  ["V", "Visa", 289.57],
  ["XOM", "Exxon Mobil", 117.85],
  ["UNH", "UnitedHealth", 567.32],
  ["WMT", "Walmart", 91.46],
  ["MA", "Mastercard", 523.6],
  ["COST", "Costco", 912.21],
  ["PG", "Procter & Gamble", 170.29],
  ["JNJ", "Johnson & Johnson", 164.81],
  ["NFLX", "Netflix", 712.5],
  ["CRM", "Salesforce", 345.21],
  ["ORCL", "Oracle", 178.34],
  ["BAC", "Bank of America", 44.15],
  ["HD", "Home Depot", 418.76],
  ["KO", "Coca-Cola", 67.82],
  ["PEP", "PepsiCo", 168.33],
  ["AMD", "AMD", 154.28],
  ["INTC", "Intel", 28.44],
  ["CSCO", "Cisco", 58.12],
  ["QCOM", "Qualcomm", 162.05],
  ["IBM", "IBM", 213.45],
  ["T", "AT&T", 22.78],
  ["DIS", "Walt Disney", 96.34],
  ["BA", "Boeing", 178.9],
  ["GE", "GE Aerospace", 187.43],
  ["CAT", "Caterpillar", 403.2],
  ["MMM", "3M", 142.5],
  ["MCD", "McDonald's", 291.4],
  ["NKE", "Nike", 76.92],
  ["SBUX", "Starbucks", 98.76],
  ["UBER", "Uber", 78.34],
  ["RIVN", "Rivian", 11.56],
  ["PLTR", "Palantir", 67.89],
  ["SHOP", "Shopify", 112.45],
  ["SOFI", "SoFi", 15.32],
  ["RBLX", "Roblox", 51.2],
  ["SPOT", "Spotify", 445.9],
  ["MSTR", "MicroStrategy", 345.6],
  ["SNOW", "Snowflake", 167.28],
  ["PANW", "Palo Alto", 388.4],
  ["CRWD", "CrowdStrike", 356.7],
  ["MU", "Micron", 113.28],
  ["ADBE", "Adobe", 478.3],
  ["PYPL", "PayPal", 84.5],
  ["INTU", "Intuit", 640.2],
  ["TXN", "Texas Instruments", 201.4],
  ["AMAT", "Applied Materials", 198.76],
  ["LRCX", "Lam Research", 78.9],
  ["MRK", "Merck", 98.4],
  ["ABBV", "AbbVie", 182.6],
  ["PFE", "Pfizer", 27.9],
  ["NEE", "NextEra Energy", 74.3],
  ["DHR", "Danaher", 246.5],
  ["ACN", "Accenture", 348.2],
  ["TMO", "Thermo Fisher", 512.3],
  ["LIN", "Linde", 462.8],
  ["ABT", "Abbott", 118.4],
  ["BMY", "Bristol-Myers", 55.6],
];

// Deterministic pseudo-random generator so prices are stable-ish between renders.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simulated live quotes for the stock universe.
function simulateQuotes(): StockQuote[] {
  const now = Date.now();
  const daySeed = Math.floor(now / 60000); // changes each minute
  return STOCK_UNIVERSE.map(([symbol, name, base], i) => {
    const rnd = mulberry32(daySeed + i * 7919);
    const drift = (rnd() - 0.48) * 0.04; // small random daily drift
    const vol = 0.6 + rnd() * 4; // percent volatility
    const open = base * (1 + (rnd() - 0.5) * 0.01);
    const price = base * (1 + drift + (rnd() - 0.5) * 0.008);
    const high = Math.max(open, price) * (1 + rnd() * 0.01);
    const low = Math.min(open, price) * (1 - rnd() * 0.01);
    const change = price - open;
    const changePct = (change / open) * 100;
    const previousClose = base;
    const volume = Math.floor(2_000_000 + rnd() * 90_000_000);
    return {
      symbol,
      name,
      price: round(price),
      change: round(change),
      changePct: round(changePct),
      open: round(open),
      high: round(high),
      low: round(low),
      previousClose: round(previousClose),
      volume,
    };
  });
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Fetch quotes. Uses real API if configured, else simulated.
export async function getStockQuotes(): Promise<StockQuote[]> {
  if (STOCK_API_KEY && STOCK_API_BASE) {
    try {
      return await fetchRealStockQuotes();
    } catch (err) {
      console.warn("Stock API failed, using simulation", err);
    }
  }
  return simulateQuotes();
}

async function fetchRealStockQuotes(): Promise<StockQuote[]> {
  const symbols = STOCK_UNIVERSE.map((s) => s[0]).join(",");
  const url = `${STOCK_API_BASE}?function=GLOBAL_QUOTE&symbol=${symbols}&apikey=${STOCK_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const quotes: StockQuote[] = [];
  // Shape depends on provider; attempt a best-effort parse.
  for (const [symbol, name] of STOCK_UNIVERSE) {
    const q = data[`Global Quote`]?.[symbol] ?? data[symbol];
    quotes.push({
      symbol,
      name,
      price: Number(q?.price ?? 0),
      change: Number(q?.change ?? 0),
      changePct: Number(q?.["10. change percent"]?.replace("%", "") ?? 0),
      volume: Number(q?.["06. volume"] ?? 0),
    });
  }
  return quotes.filter((q) => q.price > 0);
}

export function stockToAsset(q: StockQuote, rank: number): Asset {
  return {
    id: `stock-${q.symbol.toLowerCase()}`,
    symbol: q.symbol,
    name: q.name,
    type: "stock",
    price: q.price,
    priceChange24h: round(q.change),
    priceChangePct24h: round(q.changePct),
    high24h: q.high,
    low24h: q.low,
    totalVolume: q.volume,
    marketCap: q.volume ? q.volume * q.price : undefined,
    rank,
    lastUpdated: new Date().toISOString(),
  };
}

// Generate synthetic candlestick history for a stock based on its quote.
export function generateStockCandles(q: StockQuote, range: TimeRange): CandlePoint[] {
  const count = { "1D": 96, "1W": 168, "1M": 120, "3M": 180, "1Y": 365, ALL: 730 }[range];
  const stepMs = { "1D": 15 * 60e3, "1W": 60 * 60e3, "1M": 6 * 60e3 * 24, "3M": 12 * 60e3 * 24, "1Y": 60e3 * 24, ALL: 60e3 * 24 * 2 }[range];
  const now = Date.now();
  const base = q.price || q.previousClose || 100;
  const seed = base * 100;
  const rnd = mulberry32(Math.floor(seed));
  const candles: CandlePoint[] = [];
  let price = base * (1 - 0.08);
  let time = now - count * stepMs;
  for (let i = 0; i < count; i++) {
    const ret = (rnd() - 0.5) * 0.03;
    const open = price;
    const close = price * (1 + ret);
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    const volume = Math.floor((rnd() + 0.3) * (q.volume ?? 5_000_000));
    candles.push({ time, open: round(open), high: round(high), low: round(low), close: round(close), volume });
    price = close;
    time += stepMs;
  }
  // Normalize last candle to current quote price
  if (candles.length) {
    candles[candles.length - 1].close = q.price;
    candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, q.price);
  }
  return candles;
}
