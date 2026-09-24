import { NextResponse } from "next/server";
import { getAllAssets } from "@/lib/aggregator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const assets = await getAllAssets();
    return NextResponse.json({ assets, ts: Date.now() });
  } catch (err) {
    console.error("assets route error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
