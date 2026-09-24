// Formatting helpers for prices, percentages, volume, and compact numbers.

export function fmtPrice(n: number | undefined | null, currency = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const opts: Intl.NumberFormatOptions = {};
  if (abs >= 1000) opts.maximumFractionDigits = 2;
  else if (abs >= 1) opts.maximumFractionDigits = 4;
  else opts.maximumFractionDigits = 6;
  const value = n.toLocaleString("en-US", opts);
  return currency ? `$${value}` : value;
}

export function fmtCompact(n: number | undefined | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtPct(n: number | undefined | null, signed = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const v = n.toFixed(2);
  return `${signed && n > 0 ? "+" : ""}${v}%`;
}

export function fmtVolume(n: number | undefined | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

export function fmtTime(t: number | string): string {
  const d = new Date(t);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(t: number | string): string {
  const d = new Date(t);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function directionClass(pct: number): string {
  if (pct > 0) return "text-up";
  if (pct < 0) return "text-down";
  return "";
}
