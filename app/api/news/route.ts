import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";
import type { NewsCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cat = url.searchParams.get("category") as NewsCategory | null;
  const limitStr = url.searchParams.get("limit") ?? "5";
  const limit = Math.max(1, Math.min(20, Number(limitStr) || 5));
  const force = url.searchParams.get("refresh") === "1";
  try {
    const news = await getNews(
      cat === "crypto" || cat === "stocks" ? cat : undefined,
      limit,
      force,
    );
    return NextResponse.json({ news, ts: Date.now() });
  } catch (err) {
    return NextResponse.json({ news: [], error: (err as Error).message }, { status: 200 });
  }
}
