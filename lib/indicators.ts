// Technical indicator calculations: RSI, MACD, Bollinger Bands, SMA, EMA, ATR.
import type { CandlePoint, IndicatorSnapshot } from "./types";

export function sma(values: number[], period: number): number {
  if (values.length < period) return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - (ema26[i] ?? v));
  const signalLine = ema(macdLine, 9);
  const m = macdLine[macdLine.length - 1] ?? 0;
  const s = signalLine[signalLine.length - 1] ?? 0;
  return { macd: m, signal: s, histogram: m - s };
}

export function bollinger(closes: number[], period = 20, mult = 2): { upper: number; middle: number; lower: number } {
  const n = Math.min(period, closes.length);
  const slice = closes.slice(-n);
  const mid = sma(slice, n);
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  return { upper: mid + sd * mult, middle: mid, lower: mid - sd * mult };
}

export function buildIndicator(candles: CandlePoint[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const vols = candles.map((c) => c.volume);
  const r = rsi(closes);
  const m = macd(closes);
  const b = bollinger(closes);
  return {
    rsi: round(r),
    macd: round(m.macd),
    macdSignal: round(m.signal),
    macdHistogram: round(m.histogram),
    bollinger: { upper: round(b.upper), middle: round(b.middle), lower: round(b.lower) },
    sma20: round(sma(closes, 20)),
    sma50: round(sma(closes, 50)),
    volumeSma20: Math.round(sma(vols, 20)),
  };
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
