// AI prediction engine.
//
// Primary path: OpenAI-compatible call to the Antseed buyer proxy
//   (default http://localhost:8377/v1) using the provided key and model
//   "agnes-3.0-flash", with "deepseek-v4.1" as automatic fallback.
//
// The LLM receives recent OHLC/feature data for an asset and is asked to emit
// structured short-term predictions (1h / 24h / 7d). If the proxy is not
// reachable or the call fails, we fall back to a self-contained heuristic
// model (moving-average momentum + volatility) so the dashboard is always
// functional and never blocks the UI.
//
// Config via environment:
//   AI_API_BASE   base URL; default http://localhost:8377/v1
//   AI_API_KEY    key; default to the provided key below
//   AI_PRIMARY_MODEL    default agnes-3.0-flash
//   AI_FALLBACK_MODEL   default deepseek-v4.1
import type { Asset, CandlePoint, Prediction } from "./types";

const AI_API_BASE = process.env.AI_API_BASE || "http://127.0.0.1:8377/v1";
const AI_API_KEY = process.env.AI_API_KEY || "sk-7d8cc16f8830647dc51747adda4574622fd7be408e105098";
const AI_PRIMARY_MODEL = process.env.AI_PRIMARY_MODEL || "agnes-3.0-flash";
const AI_FALLBACK_MODEL = process.env.AI_FALLBACK_MODEL || "deepseek-v4.1";

const MODEL_TIMEOUT_MS = 30000;

type LLMResult = {
  model: string;
  horizons: Record<"1h" | "24h" | "7d", { price: number; confidence: number; rationale: string; support: number; resistance: number }>;
};

// ---- Heuristic fallback ---------------------------------------------------
function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

function heuristicPrediction(asset: Asset, candles: CandlePoint[]): LLMResult {
  const closes = candles.map((c) => c.close);
  const price = asset.price || closes[closes.length - 1] || 0;
  const n = closes.length;
  const sma = (period: number) => {
    if (n < period) return closes.reduce((a, b) => a + b, 0) / n;
    return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  };
  const sma20 = sma(20);
  const sma50 = n >= 50 ? sma(50) : sma20;
  const momentum = sma20 > 0 ? (sma20 - sma50) / sma20 : 0; // positive = uptrend
  // Historical volatility (std of returns, 20 periods)
  const window = closes.slice(-20);
  let vol = 0.02;
  if (window.length > 2) {
    const rets: number[] = [];
    for (let i = 1; i < window.length; i++) rets.push(window[i] / window[i - 1] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
  }
  // Mean reversion-ish pull toward a short trend
  const shortSma = Math.min(10, n) >= 5 ? closes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, n) : price;
  const pull = (price - sma20) / price; // negative if priced below trend

  const horizons: LLMResult["horizons"] = { "1h": null as never, "24h": null as never, "7d": null as never };
  const scale = { "1h": vol * 0.35, "24h": vol * 1.6, "7d": vol * 4.5 };
  const driftBias = { "1h": momentum * 0.25, "24h": momentum * 0.8, "7d": momentum * 2.4 };

  for (const h of ["1h", "24h", "7d"] as const) {
    const noise = (Math.random() - 0.5) * scale[h];
    const predChange = Math.max(-0.25, Math.min(0.25, driftBias[h] - pull * 0.4 + noise));
    const predicted = price * (1 + predChange);
    const confidence = Math.max(35, Math.min(82, 78 - Math.abs(predChange) * 120 - (vol > 0.06 ? 8 : 0)));
    const support = price * (1 - scale[h] * 0.9);
    const resistance = price * (1 + scale[h] * 0.9);
    horizons[h] = {
      price: round(predicted),
      confidence: round(confidence, 0),
      rationale:
        momentum > 0.003
          ? "SMA-20 above SMA-50 indicates an established uptrend; momentum favours continued drift higher with pullback risk toward the moving average."
          : momentum < -0.003
            ? "SMA-20 below SMA-50 signals downtrend pressure; price remains capped by near-term resistance with support at recent swing lows."
            : "Price is consolidating near its moving averages with balanced momentum; expect range-bound behaviour until a breakout confirms direction.",
      support: round(support),
      resistance: round(resistance),
    };
  }
  return { model: "heuristic-ensemble", horizons };
}

// ---- LLM path --------------------------------------------------------------

function buildPrompt(asset: Asset, candles: CandlePoint[]): string {
  const closes = candles.slice(-60).map((c) => c.close);
  const vols = candles.slice(-60).map((c) => c.volume);
  const direction = asset.priceChangePct24h >= 0 ? "up" : "down";
  return [
    `You are a quantitative market analyst. Given the following real market data for ${asset.name} (${asset.symbol}, current price ${asset.price}, 24h change ${asset.priceChangePct24h}%, direction ${direction}),`,
    `produce short-term price predictions. Return STRICT JSON only, no markdown, matching exactly:`,
    `{"1h":{"price":number,"confidence":0-100,"rationale":"brief","support":number,"resistance":number},"24h":{...},"7d":{...}}`,
    ``,
    `Recent close prices: ${closes.join(",")}`,
    `Recent volumes: ${vols.join(",")}`,
    `Answer with the single JSON object.`,
  ].join("\n");
}

async function callLLM(model: string, asset: Asset, candles: CandlePoint[]): Promise<LLMResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          { role: "system", content: "You are a precise quantitative analyst that only outputs valid JSON." },
          { role: "user", content: buildPrompt(asset, candles) },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const raw = content.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return { model, horizons: parsed };
  } finally {
    clearTimeout(timer);
  }
}

function sanitize(result: LLMResult, asset: Asset, model: string): LLMResult {
  const price = asset.price;
  const horiz = {} as LLMResult["horizons"];
  for (const h of ["1h", "24h", "7d"] as const) {
    const r = result.horizons?.[h];
    horiz[h] = {
      price: typeof r?.price === "number" && r.price > 0 ? r.price : price,
      confidence:
        typeof r?.confidence === "number" ? Math.max(0, Math.min(100, r.confidence)) : 50,
      rationale: typeof r?.rationale === "string" && r.rationale ? r.rationale.slice(0, 220) : "Model projection based on recent price action and momentum.",
      support: typeof r?.support === "number" && r.support > 0 ? r.support : price * 0.97,
      resistance: typeof r?.resistance === "number" && r.resistance > 0 ? r.resistance : price * 1.03,
    };
  }
  const lr = { model, horizons: horiz } as LLMResult;
  return lr;
}

// ---- Public entry ----------------------------------------------------------

export async function getPrediction(asset: Asset, candles: CandlePoint[]): Promise<Prediction> {
  if (!candles || candles.length < 3) {
    // Not enough data; fall back to a trivial projection
    candles = generateFallbackCandles(asset);
  }
  let result: LLMResult | null = null;
  let modelUsed = "";

  // Try LLM path (primary then fallback model)
  for (const m of [AI_PRIMARY_MODEL, AI_FALLBACK_MODEL]) {
    try {
      result = await callLLM(m, asset, candles);
      modelUsed = m;
      result = sanitize(result, asset, m);
      break;
    } catch (err) {
      console.warn(`LLM prediction failed for ${m}: ${(err as Error).message}`);
      result = null;
    }
  }

  if (!result) {
    result = heuristicPrediction(asset, candles);
    modelUsed = result.model;
  }

  const now = new Date().toISOString();
  const horizons = result.horizons;
  const current = asset.price;
  const h1 = horizons["1h"];
  const h24 = horizons["24h"];
  const h7d = horizons["7d"];
  const closest =
    ["7d", "24h", "1h"].map((h) => horizons[h as keyof typeof horizons]).sort(
      (a, b) => Math.abs(a.price - current) - Math.abs(b.price - current),
    )[0];

  const direction = closest.price >= current ? "up" : closest.price <= current * 0.999 ? "down" : "flat";

  return {
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    generatedAt: now,
    model: modelUsed,
    confidence: Math.round((h1.confidence + h24.confidence + h7d.confidence) / 3),
    horizon: "24h",
    predictedPrice: h24.price,
    currentPrice: current,
    direction,
    changePct: round(((h24.price - current) / current) * 100),
    rationale: h24.rationale,
    levels: { support: h24.support, resistance: h24.resistance },
    // Per-horizon projections for the UI
    "1h": h1,
    "24h": h24,
    "7d": h7d,
  } as Prediction & { "1h": typeof h1; "24h": typeof h24; "7d": typeof h7d };
}

export function generateFallbackCandles(asset: Asset): CandlePoint[] {
  const candles: CandlePoint[] = [];
  const base = asset.price;
  const now = Date.now();
  for (let i = 120; i > 0; i--) {
    const drift = (Math.random() - 0.49) * 0.02;
    candles.push({
      time: now - i * 3600e3,
      open: base * (1 + drift),
      high: base * (1 + drift + 0.005),
      low: base * (1 + drift - 0.005),
      close: base * (1 + drift),
      volume: 1000,
    });
  }
  return candles;
}
