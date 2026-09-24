import { NextResponse } from "next/server";
import { getAllAssets, getCandles, findAsset } from "@/lib/aggregator";
import { buildIndicator } from "@/lib/indicators";
import type { AssetDetail, TimeRange } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const range = (url.searchParams.get("range") ?? "1W") as TimeRange;
  try {
    const all = await getAllAssets();
    const asset = findAsset(all, id);
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    const candles = await getCandles(asset, range);
    const indicator = buildIndicator(candles);
    const detail: AssetDetail = { asset, candles, indicator };
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
