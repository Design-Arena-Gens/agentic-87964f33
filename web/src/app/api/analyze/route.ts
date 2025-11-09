import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Curated NSE tickers; filtered to under ?50 via latest quote
const TICKERS: string[] = [
  'IDEA.NS', 'SUZLON.NS', 'JPPOWER.NS', 'RENUKA.NS', 'YESBANK.NS', 'DISHTV.NS',
  'TV18BRDCST.NS', 'ASHOKA.NS', 'ALOKINDS.NS', 'CGPOWER.NS', 'TRIDENT.NS',
  'JPASSOCIAT.NS', 'RPOWER.NS', 'RBLBANK.NS', 'UJJIVAN.NS', 'PNCINFRA.NS',
  'SPICEJET.NS', 'MRPL.NS', 'IDEA.NS', 'IBULHSGFIN.NS', 'RECLTD.NS',
  'BANKBARODA.NS', 'UCOBANK.NS', 'SOBHA.NS', 'RAIN.NS', 'MOTHERSUMI.NS',
];

function safeNumber(n: any): number | null {
  if (n === null || n === undefined) return null;
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json,text/plain,*/*',
      'User-Agent': 'Mozilla/5.0 (compatible; AnalyzerBot/1.0)'
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetch failed: ${url} ${res.status}`);
  return res.json();
}

async function getQuote(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const json = await fetchJson(url);
  const quote = json?.quoteResponse?.result?.[0];
  const last = safeNumber(quote?.regularMarketPrice);
  const currency = quote?.currency;
  return { symbol, last, currency };
}

async function getChart(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=30d`;
  const json = await fetchJson(url);
  const result = json?.chart?.result?.[0];
  const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
  const volumes: number[] = result?.indicators?.quote?.[0]?.volume ?? [];
  return { closes: closes.filter((v: any) => v != null).map(Number), volumes: volumes.filter((v: any) => v != null).map(Number) };
}

function scoreStock(params: { last: number; closes: number[]; volumes: number[]; }): { twoDayReturn: number | null; rsi: number | null; volumeSurge: number | null; score: number } {
  const { last, closes, volumes } = params;
  let twoDayReturn: number | null = null;
  if (closes.length >= 3) {
    const c0 = closes[closes.length - 3];
    const c2 = closes[closes.length - 1];
    if (c0 && c2) twoDayReturn = ((c2 - c0) / c0) * 100;
  }
  const rsi = computeRSI(closes);
  let volumeSurge: number | null = null;
  if (volumes.length >= 6) {
    const recentAvg = volumes.slice(-6, -1).reduce((a, b) => a + b, 0) / 5;
    const lastVol = volumes[volumes.length - 1];
    if (recentAvg > 0 && lastVol) volumeSurge = lastVol / recentAvg;
  }
  let score = 0;
  if (twoDayReturn != null) score += twoDayReturn * 1.0;
  if (rsi != null) score += (rsi - 50) * 0.5; // favor RSI > 50, penalize < 50
  if (volumeSurge != null) score += (volumeSurge - 1) * 5; // boost breakouts
  if (rsi != null && rsi > 75) score -= (rsi - 75) * 1.0; // avoid overbought extremes
  if (rsi != null && rsi < 40) score -= (40 - rsi) * 1.0; // avoid weak
  if (twoDayReturn != null && twoDayReturn < 0) score += twoDayReturn; // extra penalty if negative
  // slight edge to cheaper price under the cap
  score += Math.max(0, (50 - last) / 50) * 2;
  return { twoDayReturn, rsi, volumeSurge, score };
}

export async function GET() {
  const results: any[] = [];
  // Fetch quotes first to filter under ?50
  const quotes = await Promise.allSettled(TICKERS.map(getQuote));
  const eligible = quotes
    .filter((q: any) => q.status === 'fulfilled' && q.value.last != null && q.value.last <= 50)
    .map((q: any) => q.value as { symbol: string; last: number; currency: string });

  // For each eligible, fetch chart and compute score
  for (const q of eligible) {
    try {
      const { closes, volumes } = await getChart(q.symbol);
      const { twoDayReturn, rsi, volumeSurge, score } = scoreStock({ last: q.last!, closes, volumes });
      results.push({ symbol: q.symbol, last: q.last, currency: q.currency, twoDayReturn, rsi, volumeSurge, score });
    } catch (e) {
      // ignore failures
    }
  }

  results.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  const best = results[0] ?? null;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    universeSize: TICKERS.length,
    eligibleCount: results.length,
    best,
    ranked: results,
    rules: {
      priceCapINR: 50,
      signals: ['2-day momentum', 'RSI > 50 preference', 'volume surge breakout'],
    },
    disclaimer: 'This tool is for informational purposes only and is not financial advice.'
  }, { status: 200 });
}
