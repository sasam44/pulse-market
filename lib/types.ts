// Shared type definitions for the market dashboard

export type AssetType = "crypto" | "stock";

export interface Asset {
  id: string; // internal id used for routing
  symbol: string;
  name: string;
  type: AssetType;
  image?: string;
  marketCap?: number;
  price: number;
  priceChange24h: number;
  priceChangePct24h: number;
  high24h?: number;
  low24h?: number;
  totalVolume?: number;
  sparkline?: number[];
  lastUpdated: string;
  rank?: number;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  volume?: number;
}

export interface CandlePoint {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export interface Prediction {
  assetId: string;
  symbol: string;
  name: string;
  generatedAt: string;
  model: string;
  confidence: number; // 0-100
  horizon: "1h" | "24h" | "7d";
  predictedPrice: number;
  currentPrice: number;
  direction: "up" | "down" | "flat";
  changePct: number;
  rationale: string;
  levels: {
    support: number;
    resistance: number;
  };
  // Per-horizon projections
  "1h"?: PredictionHorizon;
  "24h"?: PredictionHorizon;
  "7d"?: PredictionHorizon;
}

export interface PredictionHorizon {
  price: number;
  confidence: number;
  support: number;
  resistance: number;
}

export interface IndicatorSnapshot {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma20: number;
  sma50: number;
  volumeSma20: number;
}

export interface AssetDetail {
  asset: Asset;
  candles: CandlePoint[];
  indicator: IndicatorSnapshot;
}

export type NewsCategory = "crypto" | "stocks";

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  summary: string;
  source: string;
  category: NewsCategory;
  publishedAt: number;
  image?: string;
}
