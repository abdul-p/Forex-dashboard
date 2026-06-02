import { NextRequest, NextResponse } from "next/server";
import { FOREX_PAIRS, getTimeSeries } from "@/lib/twelvedata";

type Direction = "BUY" | "SELL" | "HOLD";

interface RawCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CalendarEvent {
  event: string;
  country: string;
  currency: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
}

const PAIR_UNIVERSE = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP"];
const CURRENCIES = ["EUR", "USD", "GBP", "JPY"];
const POSITIVE_WORDS = ["rally", "gain", "strong", "hawkish", "growth", "beats", "optimism", "higher", "resilient", "surge"];
const NEGATIVE_WORDS = ["fall", "drop", "weak", "dovish", "miss", "recession", "lower", "risk", "slump", "cuts"];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number, decimals = 2) => Number(value.toFixed(decimals));
const pipSize = (pair: string) => (pair.includes("JPY") ? 0.01 : 0.0001);
const splitPair = (pair: string) => {
  const [base = "EUR", quote = "USD"] = pair.split("/");
  return { base, quote };
};

const normalizeCandles = (values: RawCandle[] = []): Candle[] =>
  values
    .slice()
    .reverse()
    .map((item) => ({
      time: item.datetime,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
    }))
    .filter((item) => [item.open, item.high, item.low, item.close].every(Number.isFinite));

const pctChange = (candles: Candle[]) => {
  const first = candles[0]?.close;
  const last = candles[candles.length - 1]?.close;
  if (!first || !last) return 0;
  return ((last - first) / first) * 100;
};

const ema = (values: number[], period: number) => {
  if (values.length < period) return [];
  const multiplier = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  return values.slice(period - 1).map((value, index) => {
    if (index > 0) current = (value - current) * multiplier + current;
    return current;
  });
};

const rsi = (closes: number[], period = 14) => {
  if (closes.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = closes[index] - closes[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) return 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
};

const atr = (candles: Candle[], period = 14) => {
  if (candles.length <= period) return 0;
  const ranges = candles.slice(-period).map((candle, index, recent) => {
    const previousClose = recent[index - 1]?.close ?? candles[candles.length - period - 1]?.close ?? candle.close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
  });
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
};

const macdSignal = (closes: number[]) => {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  if (!fast.length || !slow.length) return "Neutral";
  const offset = fast.length - slow.length;
  const macd = slow.map((value, index) => fast[index + offset] - value);
  const signal = ema(macd, 9);
  const latestMacd = macd[macd.length - 1] ?? 0;
  const latestSignal = signal[signal.length - 1] ?? 0;
  if (latestMacd > latestSignal) return "Bullish";
  if (latestMacd < latestSignal) return "Bearish";
  return "Neutral";
};

const pearson = (first: number[], second: number[]) => {
  const length = Math.min(first.length, second.length);
  if (length < 8) return 0;
  const a = first.slice(-length);
  const b = second.slice(-length);
  const avgA = a.reduce((sum, value) => sum + value, 0) / length;
  const avgB = b.reduce((sum, value) => sum + value, 0) / length;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let index = 0; index < length; index += 1) {
    const diffA = a[index] - avgA;
    const diffB = b[index] - avgB;
    numerator += diffA * diffB;
    denomA += diffA * diffA;
    denomB += diffB * diffB;
  }

  if (!denomA || !denomB) return 0;
  return numerator / Math.sqrt(denomA * denomB);
};

const getTechnical = (pair: string, candles: Candle[]) => {
  const closes = candles.map((item) => item.close);
  const latestClose = closes[closes.length - 1] ?? 0;
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const latestEma20 = ema20[ema20.length - 1] ?? latestClose;
  const latestEma50 = ema50[ema50.length - 1] ?? latestClose;
  const rsiValue = rsi(closes);
  const macd = macdSignal(closes);
  const recent = candles.slice(-30);
  const support = Math.min(...recent.map((item) => item.low));
  const resistance = Math.max(...recent.map((item) => item.high));
  const change = pctChange(candles);
  const atrValue = atr(candles);
  const atrPips = atrValue / pipSize(pair);
  const trend = latestEma20 > latestEma50 && change > 0 ? "Bullish" : latestEma20 < latestEma50 && change < 0 ? "Bearish" : "Neutral";
  const rsiSignal = rsiValue >= 58 ? "Bullish" : rsiValue <= 42 ? "Bearish" : "Neutral";
  const bollinger = atrPips > 35 ? "Expansion" : atrPips < 18 ? "Compression" : "Normal";
  const strength = clamp(Math.abs(change) * 18 + Math.abs(latestEma20 - latestEma50) / pipSize(pair) * 0.2 + 4, 1, 10);
  const score =
    (trend === "Bullish" ? 30 : trend === "Bearish" ? 20 : 15) +
    (rsiSignal === "Bullish" ? 20 : rsiSignal === "Bearish" ? 12 : 15) +
    (macd === "Bullish" ? 20 : macd === "Bearish" ? 12 : 15) +
    clamp(strength * 3, 0, 30);

  return {
    trend,
    strength: `${round(strength, 1)}/10`,
    support: Number.isFinite(support) ? support.toFixed(pair.includes("JPY") ? 3 : 5) : "Unavailable",
    resistance: Number.isFinite(resistance) ? resistance.toFixed(pair.includes("JPY") ? 3 : 5) : "Unavailable",
    pattern: atrPips < 18 ? "Range Compression" : trend === "Bullish" ? "Bull Flag" : trend === "Bearish" ? "Falling Channel" : "No clear pattern",
    score: Math.round(clamp(score, 0, 100)),
    atrPips: Math.round(atrPips),
    indicators: [
      { label: "RSI", value: `${rsiSignal} ${round(rsiValue, 1)}` },
      { label: "MACD", value: macd },
      { label: "EMA 20", value: latestEma20 > latestEma50 ? "Above EMA 50" : "Below EMA 50" },
      { label: "Bollinger", value: bollinger },
    ],
  };
};

const fetchCalendar = async (base: string, quote: string): Promise<CalendarEvent[]> => {
  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", { next: { revalidate: 3600 } });
    const data = (await response.json()) as Record<string, unknown>[];
    return data
      .map((item) => {
        const currency = String(item.country ?? item.currency ?? "");
        return {
          event: String(item.title ?? item.event ?? "Economic event"),
          country: String(item.country ?? ""),
          currency,
          date: `${String(item.date ?? "")} ${String(item.time ?? "")}`.trim(),
          impact: String(item.impact ?? "Unknown"),
          forecast: String(item.forecast ?? "N/A"),
          previous: String(item.previous ?? "N/A"),
        };
      })
      .filter((item) => item.currency.includes(base) || item.currency.includes(quote) || item.event.includes(base) || item.event.includes(quote))
      .slice(0, 5);
  } catch {
    return [];
  }
};

const fetchNews = async (pair: string, base: string, quote: string): Promise<NewsItem[]> => {
  try {
    if (process.env.NEWSAPI_API_KEY) {
      const query = encodeURIComponent(`forex OR ${pair} OR ${base} OR ${quote}`);
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${process.env.NEWSAPI_API_KEY}`,
        { next: { revalidate: 1800 } },
      );
      const data = (await response.json()) as { articles?: { title?: string; source?: { name?: string }; publishedAt?: string }[] };
      return (data.articles ?? []).map((item) => ({
        title: item.title ?? "Market news",
        source: item.source?.name ?? "NewsAPI",
        publishedAt: item.publishedAt ?? "",
      }));
    }

    if (process.env.NEWSDATA_API_KEY) {
      const response = await fetch(
        `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=${encodeURIComponent(`${pair} forex ${base} ${quote}`)}&language=en&category=business`,
        { next: { revalidate: 1800 } },
      );
      const data = (await response.json()) as { results?: { title?: string; source_id?: string; pubDate?: string }[] };
      return (data.results ?? []).slice(0, 12).map((item) => ({
        title: item.title ?? "Market news",
        source: item.source_id ?? "NewsData",
        publishedAt: item.pubDate ?? "",
      }));
    }
  } catch {
    return [];
  }

  return [];
};

const sentimentFromNews = (news: NewsItem[]) => {
  if (!news.length) {
    return { label: "Unavailable", score: 0, detail: "Connect NewsAPI or NewsData" };
  }

  const score = news.reduce((total, item) => {
    const title = item.title.toLowerCase();
    const positive = POSITIVE_WORDS.some((word) => title.includes(word)) ? 1 : 0;
    const negative = NEGATIVE_WORDS.some((word) => title.includes(word)) ? 1 : 0;
    return total + positive - negative;
  }, 0);
  const normalized = clamp(50 + (score / news.length) * 50, 0, 100);
  const label = normalized >= 58 ? "Positive" : normalized <= 42 ? "Negative" : "Neutral";
  return { label, score: Math.round(normalized), detail: `${news.length} live headlines scored` };
};

const fetchFredMacro = async () => {
  if (!process.env.FRED_API_KEY) {
    return {
      available: false,
      rows: [
        { label: "US CPI", value: "Connect FRED" },
        { label: "US GDP", value: "Connect FRED" },
        { label: "Unemployment", value: "Connect FRED" },
        { label: "US10Y", value: "Connect FRED" },
      ],
    };
  }

  const series = [
    ["US CPI", "CPIAUCSL"],
    ["US GDP", "GDP"],
    ["Unemployment", "UNRATE"],
    ["US10Y", "DGS10"],
  ];

  const rows = await Promise.all(
    series.map(async ([label, id]) => {
      try {
        const response = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${process.env.FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`,
          { next: { revalidate: 21600 } },
        );
        const data = (await response.json()) as { observations?: { value?: string }[] };
        return { label, value: data.observations?.[0]?.value ?? "N/A" };
      } catch {
        return { label, value: "N/A" };
      }
    }),
  );

  return { available: true, rows };
};

const fetchOandaPositioning = async (pair: string) => {
  if (!process.env.OANDA_API_TOKEN) {
    return { available: false, long: 0, short: 0, detail: "Connect OANDA positioning" };
  }

  try {
    const instrument = pair.replace("/", "_");
    const baseUrl = process.env.OANDA_API_URL ?? "https://api-fxpractice.oanda.com";
    const response = await fetch(`${baseUrl}/v3/instruments/${instrument}/positionBook`, {
      headers: { Authorization: `Bearer ${process.env.OANDA_API_TOKEN}` },
      next: { revalidate: 900 },
    });
    const data = (await response.json()) as { positionBook?: { buckets?: { longCountPercent?: string; shortCountPercent?: string }[] } };
    const buckets = data.positionBook?.buckets ?? [];
    const longTotal = buckets.reduce((sum, bucket) => sum + Number(bucket.longCountPercent ?? 0), 0);
    const shortTotal = buckets.reduce((sum, bucket) => sum + Number(bucket.shortCountPercent ?? 0), 0);
    const total = longTotal + shortTotal;
    if (!total) return { available: false, long: 0, short: 0, detail: "No positioning data returned" };
    return {
      available: true,
      long: Math.round((longTotal / total) * 100),
      short: Math.round((shortTotal / total) * 100),
      detail: "OANDA position book",
    };
  } catch {
    return { available: false, long: 0, short: 0, detail: "OANDA positioning unavailable" };
  }
};

const buildCurrencyStrength = (seriesByPair: Map<string, Candle[]>) => {
  const scores = new Map<string, number>();
  for (const [pair, candles] of seriesByPair) {
    const { base, quote } = splitPair(pair);
    const change = pctChange(candles);
    scores.set(base, (scores.get(base) ?? 0) + change);
    scores.set(quote, (scores.get(quote) ?? 0) - change);
  }

  return [...scores.entries()]
    .map(([code, score]) => ({ code, score: round(score, 2) }))
    .sort((first, second) => second.score - first.score);
};

const buildCurrencyIndex = (seriesByPair: Map<string, Candle[]>) => {
  const length = Math.min(...[...seriesByPair.values()].map((candles) => candles.length).filter(Boolean));
  const indexes = new Map<string, number[]>();
  CURRENCIES.forEach((currency) => indexes.set(currency, Array.from({ length: Math.max(length - 1, 0) }, () => 0)));

  for (const [pair, candles] of seriesByPair) {
    const { base, quote } = splitPair(pair);
    const aligned = candles.slice(-length);
    for (let index = 1; index < aligned.length; index += 1) {
      const move = ((aligned[index].close - aligned[index - 1].close) / aligned[index - 1].close) * 100;
      const targetIndex = index - 1;
      const baseSeries = indexes.get(base);
      const quoteSeries = indexes.get(quote);
      if (baseSeries) baseSeries[targetIndex] += move;
      if (quoteSeries) quoteSeries[targetIndex] -= move;
    }
  }

  return indexes;
};

const buildCorrelations = (seriesByPair: Map<string, Candle[]>) => {
  const pairRows = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD"]
    .filter((pair) => seriesByPair.has(pair))
    .map((pair) => {
      const selected = seriesByPair.get("EUR/USD") ?? [];
      const other = seriesByPair.get(pair) ?? [];
      const selectedReturns = selected.slice(1).map((item, index) => ((item.close - selected[index].close) / selected[index].close) * 100);
      const otherReturns = other.slice(1).map((item, index) => ((item.close - other[index].close) / other[index].close) * 100);
      return { label: `EUR/USD vs ${pair}`, value: Math.round(pearson(selectedReturns, otherReturns) * 100) };
    });

  const indexes = buildCurrencyIndex(seriesByPair);
  const matrix = CURRENCIES.map((row) => ({
    currency: row,
    values: CURRENCIES.map((col) => (row === col ? null : Math.round(pearson(indexes.get(row) ?? [], indexes.get(col) ?? []) * 100))),
  }));

  return { pairRows, matrix };
};

const getMarketRegime = (technicals: ReturnType<typeof getTechnical>[]) => {
  const averageTrend = technicals.reduce((sum, item) => sum + item.score, 0) / Math.max(technicals.length, 1);
  const averageAtr = technicals.reduce((sum, item) => sum + item.atrPips, 0) / Math.max(technicals.length, 1);
  if (averageTrend >= 70 && averageAtr >= 20) return "Trending";
  if (averageAtr >= 35) return "Volatile";
  return "Range Bound";
};

const buildOpportunities = (
  seriesByPair: Map<string, Candle[]>,
  strengths: { code: string; score: number }[],
  newsSentimentScore: number,
  highImpactEvents: number,
) =>
  [...seriesByPair.entries()]
    .map(([pair, candles]) => {
      const technical = getTechnical(pair, candles);
      const { base, quote } = splitPair(pair);
      const baseStrength = strengths.find((item) => item.code === base)?.score ?? 0;
      const quoteStrength = strengths.find((item) => item.code === quote)?.score ?? 0;
      const fundamentalScore = clamp(50 + (baseStrength - quoteStrength) * 8 - highImpactEvents * 5, 0, 100);
      const finalScore = Math.round(technical.score * 0.4 + fundamentalScore * 0.4 + newsSentimentScore * 0.2);
      const direction: Direction = technical.trend === "Bullish" ? "BUY" : technical.trend === "Bearish" ? "SELL" : "HOLD";
      const risk = highImpactEvents > 1 || technical.atrPips > 45 ? "High" : technical.atrPips > 25 ? "Medium" : "Low";
      const volatility = technical.atrPips > 45 ? "High" : technical.atrPips > 25 ? "Medium" : "Low";

      return {
        pair,
        score: finalScore,
        direction,
        risk,
        volatility,
        rr: finalScore >= 80 ? "1:3.5" : finalScore >= 65 ? "1:2.5" : "1:1.5",
        confidence: `${finalScore}%`,
      };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "EUR/USD";
  const safeSymbol = FOREX_PAIRS.includes(symbol) ? symbol : "EUR/USD";
  const { base, quote } = splitPair(safeSymbol);

  try {
    const pairs = [...new Set([safeSymbol, ...PAIR_UNIVERSE])];
    const seriesResults = await Promise.all(
      pairs.map(async (pair) => {
        try {
          const data = (await getTimeSeries(pair, "1h")) as { values?: RawCandle[] };
          return [pair, normalizeCandles(data.values ?? [])] as const;
        } catch {
          return [pair, [] as Candle[]] as const;
        }
      }),
    );
    const seriesByPair = new Map(seriesResults.filter(([, candles]) => candles.length > 5));
    const selectedCandles = seriesByPair.get(safeSymbol) ?? [];
    const selectedTechnical = getTechnical(safeSymbol, selectedCandles);
    const allTechnicals = [...seriesByPair.entries()].map(([pair, candles]) => getTechnical(pair, candles));
    const strengths = buildCurrencyStrength(seriesByPair);
    const strongest = strengths[0] ?? { code: "N/A", score: 0 };
    const weakest = strengths[strengths.length - 1] ?? { code: "N/A", score: 0 };
    const riskScore = ((strengths.find((item) => item.code === "AUD")?.score ?? 0) + (strengths.find((item) => item.code === "GBP")?.score ?? 0)) - (strengths.find((item) => item.code === "JPY")?.score ?? 0);
    const riskSentiment = riskScore > 0.15 ? "Risk-On" : riskScore < -0.15 ? "Risk-Off" : "Neutral";

    const [calendar, news, macro, positioning] = await Promise.all([
      fetchCalendar(base, quote),
      fetchNews(safeSymbol, base, quote),
      fetchFredMacro(),
      fetchOandaPositioning(safeSymbol),
    ]);
    const newsSentiment = sentimentFromNews(news);
    const highImpactEvents = calendar.filter((item) => item.impact.toLowerCase().includes("high")).length;
    const correlations = buildCorrelations(seriesByPair);
    const opportunities = buildOpportunities(seriesByPair, strengths, newsSentiment.score || 50, highImpactEvents);
    const topSetup = opportunities[0];

    return NextResponse.json({
      symbol: safeSymbol,
      generatedAt: new Date().toISOString(),
      sources: {
        market: "Twelve Data",
        calendar: "ForexFactory weekly calendar feed",
        macro: macro.available ? "FRED" : "FRED not configured",
        news: news.length ? (process.env.NEWSAPI_API_KEY ? "NewsAPI" : "NewsData") : "News provider not configured",
        positioning: positioning.available ? "OANDA position book" : "OANDA not configured",
      },
      marketSummary: [
        { label: "Market Regime", value: getMarketRegime(allTechnicals), detail: "Derived from trend score and ATR", tone: "blue" },
        { label: "Risk Sentiment", value: riskSentiment, detail: "Derived from AUD/GBP/JPY strength", tone: riskSentiment === "Risk-On" ? "green" : "red" },
        { label: "Strongest Currency", value: strongest.code, detail: `${strongest.score}% relative strength`, tone: "amber" },
        { label: "Weakest Currency", value: weakest.code, detail: `${weakest.score}% relative strength`, tone: "red" },
        { label: "Most Active Session", value: "London / New York", detail: "Liquidity overlap", tone: "violet" },
      ],
      technical: selectedTechnical,
      fundamental: {
        events: calendar,
        banks: [
          { label: "Fed", value: "Rate-sensitive" },
          { label: "ECB", value: base === "EUR" || quote === "EUR" ? "In focus" : "Watch" },
          { label: "BOJ", value: base === "JPY" || quote === "JPY" ? "In focus" : "Watch" },
        ],
        macroRows: macro.rows,
      },
      sentiment: {
        retail: positioning,
        news: newsSentiment,
        social: { label: "Unavailable", detail: "Connect X/Reddit API for social NLP" },
        headlines: news.slice(0, 4),
      },
      ai: {
        narrative: `${safeSymbol} is ${selectedTechnical.trend.toLowerCase()} on 1H data with ${selectedTechnical.strength} trend strength. ${highImpactEvents ? `${highImpactEvents} high-impact event(s) may affect volatility.` : "No high-impact pair event is currently in the filtered calendar."}`,
        forecast: `${base}/${quote} ${selectedTechnical.trend === "Bearish" ? "bearish" : selectedTechnical.trend === "Bullish" ? "bullish" : "neutral"} bias with ${selectedTechnical.score}% model confidence.`,
        alert: highImpactEvents ? `${calendar[0]?.event ?? "High-impact event"} is on the calendar. Expect elevated volatility.` : "No high-impact event found for this pair in the current calendar feed.",
        topSetup,
      },
      correlations,
      opportunities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build analysis";
    return NextResponse.json({ message }, { status: 500 });
  }
}
