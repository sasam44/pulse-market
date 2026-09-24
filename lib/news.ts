// News aggregation from reputable public RSS feeds (no API key required).
// Crypto: CoinDesk, CoinTelegraph
// Stocks/Finance: CNBC top news, Yahoo Finance (via RSS)
//
// Feeds are fetched server-side, parsed, deduplicated and sorted by recency.
import type { NewsItem, NewsCategory } from "./types";

export const NEWS_FEEDS: Record<NewsCategory, { name: string; url: string }[]> = {
  crypto: [
    { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
    { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  ],
  stocks: [
    { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
  ],
};

let cache: { data: NewsItem[]; at: number } | null = null;
const CACHE_TTL = 300_000; // 5 min — news isn't as latency-sensitive as prices

function decodeHtml(str: string): string {
  return str
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  // Decode entities and strip CDATA markers FIRST, then remove any leftover
  // HTML tags. Order matters: CDATA-wrapped plain text has no internal ">",
  // so stripping tags before CDATA would consume the entire value.
  return decodeHtml(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "PulseMarkets/1.0 (+https://localhost)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseRss(xml: string, source: string, category: NewsCategory): NewsItem[] {
  const items: NewsItem[] = [];
  // Split on <item> blocks
  const blockRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml))) {
    const block = m[1];
    const grab = (tag: string) => {
      const r = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      return r ? r[1].trim() : "";
    };
    const title = stripTags(grab("title"));
    const link = stripTags(grab("link"));
    const description = stripTags(grab("description"));
    const pubDateRaw = grab("pubDate") || grab("dc:date");
    let pubDate = Date.now();
    if (pubDateRaw) {
      const d = new Date(pubDateRaw);
      if (!isNaN(d.getTime())) pubDate = d.getTime();
    }
    if (!title || !link) continue;
    items.push({
      id: `${category}-${source}-${link}`,
      title,
      link,
      summary: description.slice(0, 260),
      source,
      category,
      publishedAt: pubDate,
      image: extractImage(grab("description")),
    });
  }
  return items;
}

export async function getNews(
  category?: NewsCategory,
  limit = 5,
  force = false,
): Promise<NewsItem[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL && cache.data.length > 0) {
    let list = cache.data;
    if (category) list = list.filter((n) => n.category === category);
    return list.slice(0, limit);
  }

  const categories: NewsCategory[] = category ? [category] : ["crypto", "stocks"];
  const all: NewsItem[] = [];
  const tasks: Promise<NewsItem[]>[] = [];

  for (const cat of categories) {
    for (const feed of NEWS_FEEDS[cat]) {
      tasks.push(
        fetchFeed(feed.url)
          .then((xml) => parseRss(xml, feed.name, cat))
          .catch((e) => {
            console.warn(`News feed failed (${feed.name}): ${e.message}`);
            return [] as NewsItem[];
          }),
      );
    }
  }

  const results = await Promise.all(tasks);
  for (const r of results) all.push(...r);

  // dedupe by title (normalized)
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of all.sort((a, b) => b.publishedAt - a.publishedAt)) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  cache = deduped.length > 0 ? { data: deduped, at: Date.now() } : cache;
  if (category) return deduped.filter((n) => n.category === category).slice(0, limit);
  return deduped.slice(0, limit);
}
