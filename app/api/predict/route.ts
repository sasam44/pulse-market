import { NextResponse } from "next/server";
import { getAllAssets, getCandles, findAsset } from "@/lib/aggregator";
import { getPrediction } from "@/lib/ai";
import type { TimeRange, AssetDetail, Prediction } from "@/lib/types";

export const dynamic = "force-dynamic";

// Small in-memory cache per asset+horizon to avoid redundant LLM calls.
const cache = new Map<string, { data: Prediction; at: number }>();
const TTL = 90_000; // 90s

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const key = `pred:${id}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ prediction: hit.data, cached: true });
  }
  try {
    const all = await getAllAssets();
    const asset = findAsset(all, id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    // Build a richer candle set for prediction using multi-range history
    const candleRange: TimeRange = "3M";
    const candles = await getCandles(asset, candleRange);
    const prediction = await getPrediction(asset, candles);
    cache.set(key, { data: prediction, at: Date.now() });
    return NextResponse.json({ prediction, cached: false });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Re-exporting types for convenience in client components.
export type { AssetDetail, Prediction };
