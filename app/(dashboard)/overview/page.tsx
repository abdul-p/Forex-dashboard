"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bell, Clock3 } from "lucide-react";

interface Quote {
  pair: string;
  price: string;
}

interface Trade {
  _id: string;
  pair: string;
  type: "buy" | "sell";
  entryPrice: number;
  lotSize: number;
  profit?: number;
  status: "open" | "closed";
  openedAt: string;
}

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact?: "High" | "Medium" | "Low";
}

interface Candle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface NewsArticle {
  title: string;
  link?: string;
  source?: string;
}

type SessionBlock = {
  name: string;
  start: number;
  end: number;
};

type CurrencyMeta = {
  code: string;
  flag: string;
  pair: string;
  direction: "base" | "quote";
};

const FOREX_SESSIONS: SessionBlock[] = [
  { name: "Sydney", start: 22, end: 7 },
  { name: "Tokyo", start: 0, end: 9 },
  { name: "London", start: 8, end: 17 },
  { name: "New York", start: 13, end: 22 },
];

const CURRENCY_STRENGTH: CurrencyMeta[] = [
  { code: "EUR", flag: "🇪🇺", pair: "EUR/USD", direction: "base" },
  { code: "GBP", flag: "🇬🇧", pair: "GBP/USD", direction: "base" },
  { code: "AUD", flag: "🇦🇺", pair: "AUD/USD", direction: "base" },
  { code: "JPY", flag: "🇯🇵", pair: "USD/JPY", direction: "quote" },
];

const MAJOR_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
];

const HEATMAP_CURRENCIES = [
  { code: "USD", flag: "🇺🇸" },
  { code: "EUR", flag: "🇪🇺" },
  { code: "GBP", flag: "🇬🇧" },
  { code: "JPY", flag: "🇯🇵" },
  { code: "AUD", flag: "🇦🇺" },
];

const pad = (value: number) => value.toString().padStart(2, "0");

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const sessionIsOpen = (hour: number, start: number, end: number) => {
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const sessionRemaining = (hour: number, minute: number, start: number, end: number) => {
  const currentMinutes = hour * 60 + minute;
  let endMinutes = end * 60;
  if (start >= end && currentMinutes >= start * 60) {
    endMinutes += 24 * 60;
  }
  if (start >= end && currentMinutes < start * 60) {
    return endMinutes - currentMinutes;
  }
  return Math.max(endMinutes - currentMinutes, 0);
};

const formatRemaining = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m remaining`;
  return `${hours}h ${minutes}m remaining`;
};

const overlapLabel = (openSessions: string[]) => {
  if (openSessions.includes("London") && openSessions.includes("New York")) {
    return "London + New York overlap";
  }
  if (openSessions.includes("Tokyo") && openSessions.includes("London")) {
    return "Tokyo + London overlap";
  }
  if (openSessions.includes("Sydney") && openSessions.includes("Tokyo")) {
    return "Sydney + Tokyo overlap";
  }
  return "No major overlap";
};

const getForexMarketState = (date: Date) => {
  const utcDay = date.getUTCDay();
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const utcMinutes = utcHour * 60 + utcMinute;
  const fridayClose = 22 * 60;
  const sundayOpen = 22 * 60;

  if (utcDay === 6) return "Closed";
  if (utcDay === 0 && utcMinutes < sundayOpen) return "Closed";
  if (utcDay === 5 && utcMinutes >= fridayClose) return "Closed";
  return "Open";
};

const calculateAtrPercent = (candles: Candle[]) => {
  if (candles.length < 2) return null;

  const chronological = candles.slice().reverse();
  const ranges = chronological.slice(1, 15).map((candle, index) => {
    const previousClose = Number(chronological[index].close);
    const high = Number(candle.high);
    const low = Number(candle.low);
    return Math.max(
      high - low,
      Math.abs(high - previousClose),
      Math.abs(low - previousClose),
    );
  });
  const latestClose = Number(chronological[chronological.length - 1].close);
  if (!ranges.length || !latestClose) return null;

  const atr = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  return (atr / latestClose) * 100;
};

const getVolatilityLevel = (atrPercent: number | null) => {
  if (atrPercent === null) {
    return { label: "Loading", detail: "ATR pending", score: 0 };
  }
  const score = clamp((atrPercent / 0.5) * 100, 0, 100);
  if (atrPercent >= 0.35) {
    return { label: "High", detail: `${atrPercent.toFixed(2)}% ATR`, score };
  }
  if (atrPercent >= 0.18) {
    return { label: "Moderate", detail: `${atrPercent.toFixed(2)}% ATR`, score };
  }
  return { label: "Low", detail: `${atrPercent.toFixed(2)}% ATR`, score };
};

const getCurrencyStrength = (changes: Record<string, number>) => {
  return CURRENCY_STRENGTH.map((currency) => {
    const pairChange = changes[currency.pair] || 0;
    const strength =
      currency.direction === "base" ? pairChange : pairChange * -1;
    return {
      ...currency,
      strength,
      score: clamp(Math.abs(strength) * 2500, 4, 100),
    };
  });
};

const getRiskSentiment = (
  changes: Record<string, number>,
  strengths: ReturnType<typeof getCurrencyStrength>,
) => {
  const hasMovement = Object.keys(changes).length > 0;
  const riskFlow =
    (strengths.find((item) => item.code === "AUD")?.strength || 0) +
    (strengths.find((item) => item.code === "GBP")?.strength || 0);
  const safetyFlow = strengths.find((item) => item.code === "JPY")?.strength || 0;
  const score = hasMovement ? clamp(50 + (riskFlow - safetyFlow) * 2000, 0, 100) : 50;

  if (!hasMovement) {
    return {
      label: "Neutral",
      detail: "Waiting for price movement",
      seeking: "Balanced exposure",
      score,
    };
  }
  if (score >= 58) {
    return {
      label: "Risk-On",
      detail: "AUD/GBP bid",
      seeking: "Higher returns",
      score,
    };
  }
  if (score <= 42) {
    return {
      label: "Risk-Off",
      detail: "JPY safety bid",
      seeking: "Safety assets",
      score,
    };
  }
  return {
    label: "Neutral",
    detail: "Mixed currency flow",
    seeking: "Balanced exposure",
    score,
  };
};

const getPairSignal = (change: number) => {
  if (change > 0.01) return "Buy";
  if (change < -0.01) return "Sell";
  return "Hold";
};

const getPairTrend = (change: number) => {
  if (change > 0.01) return "Up";
  if (change < -0.01) return "Down";
  return "Flat";
};

const getIndicativeSpread = (price: string) => {
  const numericPrice = Number(price);
  if (!numericPrice) return "N/A";
  const pipSize = numericPrice > 20 ? 0.01 : 0.0001;
  return `${(pipSize / numericPrice * 10000).toFixed(1)} pips`;
};

const getSparklinePoints = (candles: Candle[]) => {
  const closes = candles
    .slice(0, 16)
    .reverse()
    .map((candle) => Number(candle.close))
    .filter(Boolean);
  if (closes.length < 2) return "";

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  return closes
    .map((close, index) => {
      const x = (index / (closes.length - 1)) * 72;
      const y = 24 - ((close - min) / range) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const parseCalendarDate = (event: CalendarEvent) => {
  const dateText = `${event.date} ${event.time || "00:00"}`;
  const parsed = new Date(dateText);
  return Number.isNaN(parsed.getTime()) ? new Date(event.date) : parsed;
};

const formatCountdown = (target: Date, now: Date) => {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "Now";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const analyzeHeadlineSentiment = (headline: string) => {
  const text = headline.toLowerCase();
  const positiveTerms = ["positive", "bull", "gain", "rally", "strong", "surge", "beat", "up"];
  const negativeTerms = ["negative", "bear", "loss", "drop", "weak", "slump", "miss", "fall", "sell", "risk"];
  const score =
    positiveTerms.filter((term) => text.includes(term)).length -
    negativeTerms.filter((term) => text.includes(term)).length;

  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
};

const deriveNewsSentimentLabel = (articles: NewsArticle[]) => {
  if (!articles.length) return "Neutral";
  const score = articles.reduce(
    (sum, article) => sum + analyzeHeadlineSentiment(article.title),
    0,
  );
  if (score >= 2) return "Positive";
  if (score <= -2) return "Negative";
  return "Neutral";
};

const buildRetailPositioningText = (eurusdChange: number) => {
  if (eurusdChange >= 0.15) {
    return {
      label: "78% LONG EUR/USD",
      detail: "Retail momentum is bullish; watch reversal risk near resistance.",
    };
  }
  if (eurusdChange <= -0.15) {
    return {
      label: "72% SHORT EUR/USD",
      detail: "Retail is heavily short; contrarian setups may emerge.",
    };
  }
  return {
    label: "58% LONG EUR/USD",
    detail: "Retail is mildly biased long with room for continuation.",
  };
};

export default function OverviewPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteChanges, setQuoteChanges] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [marketCandles, setMarketCandles] = useState<Candle[]>([]);
  const [pairCandles, setPairCandles] = useState<Record<string, Candle[]>>({});
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [utcNow, setUtcNow] = useState(() => new Date());
  const previousPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    fetchQuotes();
    fetchTrades();
    fetchCalendar();
    fetchMarketCandles();
    fetchPairCandles();
    fetchNews();
    const timeTick = setInterval(() => setUtcNow(new Date()), 1000);
    const interval = setInterval(fetchQuotes, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(timeTick);
    };
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await fetch("/api/market");
      const data = await res.json();
      const formatted = Object.entries(data).map(([pair, val]: any) => ({
        pair,
        price: val.price,
      }));

      const nextPrices: Record<string, number> = {};
      const nextChanges: Record<string, number> = {};
      formatted.forEach((quote) => {
        const price = Number(quote.price);
        const previousPrice = previousPricesRef.current[quote.pair];
        if (previousPrice) {
          nextChanges[quote.pair] = ((price - previousPrice) / previousPrice) * 100;
        }
        nextPrices[quote.pair] = price;
      });
      previousPricesRef.current = nextPrices;
      setQuoteChanges(nextChanges);
      setQuotes(formatted);
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setQuotesLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await fetch("/api/trades");
      const data = await res.json();
      setTrades(data.trades || []);
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setTradesLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    }
  };

  const fetchMarketCandles = async () => {
    try {
      const res = await fetch("/api/market/timeseries?symbol=EUR/USD&interval=1h");
      const data = await res.json();
      setMarketCandles(Array.isArray(data.values) ? data.values : []);
    } catch (error) {
      console.error("Failed to fetch market candles:", error);
    }
  };

  const fetchPairCandles = async () => {
    try {
      const entries = await Promise.all(
        MAJOR_PAIRS.map(async (pair) => {
          const res = await fetch(
            `/api/market/timeseries?symbol=${encodeURIComponent(pair)}&interval=1h`,
          );
          const data = await res.json();
          return [pair, Array.isArray(data.values) ? data.values : []] as const;
        }),
      );
      setPairCandles(Object.fromEntries(entries));
    } catch (error) {
      console.error("Failed to fetch pair candles:", error);
    }
  };

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news");
      const data = await res.json();
      const articles = Array.isArray(data.results)
        ? data.results.map((item: any) => ({
            title: item.title || item.description || "Untitled",
            link: item.link,
            source: item.source_id,
          }))
        : [];
      setNewsItems(articles.slice(0, 6));
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setNewsLoading(false);
    }
  };

  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status === "closed");
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0);
  const winRate =
    closedTrades.length > 0
      ? Math.round((winningTrades.length / closedTrades.length) * 100)
      : 0;
  const userName = session?.user.name?.split(" ")[0] || "Account";
  const utcHour = utcNow.getUTCHours();
  const utcMinute = utcNow.getUTCMinutes();
  const utcDayLabel = utcNow.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const utcTimeLabel = `${pad(utcHour)}:${pad(utcMinute)} UTC`;
  const utcDateKey = utcNow.toISOString().split("T")[0];
  const openSessions = FOREX_SESSIONS.filter((block) =>
    sessionIsOpen(utcHour, block.start, block.end),
  );
  const currentSession =
    openSessions.find((block) => block.name === "London") ||
    openSessions[0];
  const currentSessionRemaining = currentSession
    ? formatRemaining(
        sessionRemaining(utcHour, utcMinute, currentSession.start, currentSession.end),
      )
    : "Session closed";
  const overlapText = overlapLabel(openSessions.map((block) => block.name));
  const highImpactToday = events.filter(
    (event) => event.date === utcDateKey && event.impact === "High",
  );
  const dynamicAlerts = [
    ...highImpactToday.map((event) => `${event.country} ${event.title}`),
    ...(openTrades.length > 0
      ? [`${openTrades.length} open trade${openTrades.length === 1 ? "" : "s"}`]
      : []),
    ...(!quotesLoading && quotes.length === 0 ? ["Market feed unavailable"] : []),
  ];
  const notificationCount = dynamicAlerts.length;
  const notificationLabel =
    dynamicAlerts[0] ||
    (quotesLoading || tradesLoading ? "Checking alerts" : "No active alerts");
  const forexMarketState = getForexMarketState(utcNow);
  const atrPercent = calculateAtrPercent(marketCandles);
  const volatility = getVolatilityLevel(atrPercent);
  const currencyStrength = getCurrencyStrength(quoteChanges);
  const riskSentiment = getRiskSentiment(quoteChanges, currencyStrength);
  const activeSession = openSessions.length > 1
    ? overlapText
    : currentSession?.name || "Closed";
  const volatilityTextColor =
    volatility.label === "High" ? "text-red-400" : "text-white";
  const volatilityMeterStyle = {
    width: `${volatility.score}%`,
  };
  const riskGaugeStyle = {
    background: `conic-gradient(var(--accent) ${riskSentiment.score * 1.8}deg, #1f2937 0deg 180deg)`,
  };
  const quoteByPair = Object.fromEntries(
    quotes.map((quote) => [quote.pair, quote]),
  );
  const majorPairRows = MAJOR_PAIRS.map((pair) => {
    const quote = quoteByPair[pair];
    const change = quoteChanges[pair] || 0;
    return {
      pair,
      price: quote?.price || null,
      change,
      spread: quote ? getIndicativeSpread(quote.price) : "N/A",
      trend: getPairTrend(change),
      signal: getPairSignal(change),
      sparkline: getSparklinePoints(pairCandles[pair] || []),
    };
  });
  const strengthByCurrency = Object.fromEntries(
    currencyStrength.map((currency) => [currency.code, currency.strength]),
  );
  const heatmapRows = HEATMAP_CURRENCIES.map((base) =>
    HEATMAP_CURRENCIES.map((quote) => ({
      label: `${base.code}/${quote.code}`,
      base,
      quote,
      value: (strengthByCurrency[base.code] || 0) - (strengthByCurrency[quote.code] || 0),
    })),
  );
  const heatmapValues = heatmapRows
    .flat()
    .filter((cell) => cell.base.code !== cell.quote.code)
    .map((cell) => Math.abs(cell.value));
  const heatmapScore =
    heatmapValues.length > 0
      ? clamp(
          (heatmapValues.reduce((sum, value) => sum + value, 0) /
            heatmapValues.length) *
            2200,
          0,
          100,
        )
      : 0;
  const heatmapStrengthLabel =
    heatmapScore >= 62 ? "Strong" : heatmapScore >= 28 ? "Neutral" : "Weak";
  const upcomingEvents = events
    .map((event) => ({ ...event, eventDate: parseCalendarDate(event) }))
    .filter((event) => event.eventDate.getTime() >= utcNow.getTime())
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, 4);

  const nextHighImpactEvent = upcomingEvents.find((event) => event.impact === "High");
  const nextHighImpactCountdown = nextHighImpactEvent
    ? formatCountdown(nextHighImpactEvent.eventDate, utcNow)
    : null;
  const newsSentiment = deriveNewsSentimentLabel(newsItems);
  const retailPositioning = buildRetailPositioningText(quoteChanges["EUR/USD"] || 0);
  const floatingPnl = openTrades.reduce((sum, trade) => {
    const quote = quoteByPair[trade.pair];
    if (!quote) return sum;
    const currentPrice = Number(quote.price);
    const delta = trade.type === "buy"
      ? currentPrice - trade.entryPrice
      : trade.entryPrice - currentPrice;
    return sum + delta * trade.lotSize * 1000;
  }, 0);
  const accountBalance = session?.user.balance || 0;
  const equity = accountBalance + floatingPnl;
  const exposureNotional = openTrades.reduce(
    (sum, trade) => sum + Math.abs(trade.entryPrice * trade.lotSize * 1000),
    0,
  );
  const marginUsage = accountBalance > 0
    ? clamp((exposureNotional / accountBalance) * 4, 0, 100)
    : 0;
  const usdExposure = openTrades.reduce((sum, trade) => {
    if (trade.pair.includes("USD/") || trade.pair.includes("/USD")) {
      return sum + Math.abs(trade.entryPrice * trade.lotSize * 1000);
    }
    return sum;
  }, 0);
  const usdExposurePercent = exposureNotional > 0
    ? clamp((usdExposure / exposureNotional) * 100, 0, 100)
    : 0;
  const peakEquity = Math.max(accountBalance, equity);
  const drawdownPercent = peakEquity > 0
    ? Math.max(0, ((peakEquity - equity) / peakEquity) * 100)
    : 0;
  const sortedByGain = majorPairRows
    .filter((row) => row.price !== null)
    .slice()
    .sort((a, b) => b.change - a.change);
  const sortedByLoss = sortedByGain.slice().reverse();
  const sortedByVolatility = majorPairRows
    .filter((row) => row.price !== null)
    .slice()
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const gainers = sortedByGain.slice(0, 3);
  const losers = sortedByLoss.slice(0, 3);
  const mostVolatile = sortedByVolatility.slice(0, 3);
  const aiInsights = [
    majorPairRows[0]
      ? `${majorPairRows[0].pair} ${majorPairRows[0].change >= 0 ? "gaining upward momentum" : "showing downward pressure"}`
      : "Waiting for market movement",
    riskSentiment.label === "Risk-On"
      ? "Risk-on mode suggests momentum trades across growth currencies."
      : riskSentiment.label === "Risk-Off"
      ? "Risk-off mode favors safe-haven flows and defensive positions."
      : "Mixed market sentiment; look for confirmation before committing.",
    nextHighImpactEvent
      ? `${nextHighImpactEvent.country} ${nextHighImpactEvent.title} in ${nextHighImpactCountdown}`
      : "No high-impact headline event scheduled soon.",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-semibold text-white">FXPro</span>
          <span className="text-gray-600">/</span>
          <span className="truncate font-medium text-gray-300">{userName}</span>
        </div>

        <div className="hidden h-5 w-px bg-gray-800 sm:block" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 text-xs">
          {FOREX_SESSIONS.map((block) => {
            const isOpen = sessionIsOpen(utcHour, block.start, block.end);
            return (
              <div
                key={block.name}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 ${
                  isOpen
                    ? "border-[var(--border-soft)] bg-[var(--accent-soft)] text-gray-200"
                    : "border-gray-800 bg-gray-900/70 text-gray-500"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOpen ? "bg-[var(--accent)]" : "bg-gray-700"
                  }`}
                />
                {block.name}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end rounded-md border border-gray-800 bg-gray-900/70 px-2 py-1 text-xs">
            <div className="flex items-center gap-1.5 text-gray-300">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{utcTimeLabel}</span>
              <span className="text-gray-600">{utcDayLabel}</span>
            </div>
            <span className="mt-0.5 text-[11px] text-gray-500">
              {currentSessionRemaining}
            </span>
          </div>

          <button
            type="button"
            aria-label={notificationLabel}
            title={notificationLabel}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-800 text-gray-400 transition hover:border-gray-700 hover:text-white"
          >
            <Bell className="h-4 w-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-gray-950">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Market Status */}
      <div className="grid gap-3 lg:grid-cols-4">
        <section className="rounded-lg border border-gray-800 bg-gray-950/40">
          <div className="border-b border-gray-800 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Market Status
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 p-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Forex Market
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {forexMarketState}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Session
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {activeSession}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Volatility
              </p>
              <p className={`mt-1 text-sm font-semibold ${volatilityTextColor}`}>
                {volatility.label}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                ATR Score
              </p>
              <p className={`mt-1 text-sm font-semibold ${volatilityTextColor}`}>
                {volatility.detail}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500">
                Risk Sentiment
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {riskSentiment.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {riskSentiment.detail}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Currency Strength vs USD
          </h2>
          <div className="mt-3 space-y-3">
            {currencyStrength.map((currency) => (
              <div key={currency.code}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-sm">{currency.flag}</span>
                    <span className="font-medium">{currency.code}</span>
                  </div>
                  <span
                    className={
                      currency.strength >= 0 ? "text-[var(--accent)]" : "text-red-400"
                    }
                  >
                    {currency.strength >= 0 ? "+" : ""}
                    {currency.strength.toFixed(3)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full ${
                      currency.strength >= 0 ? "bg-[var(--accent)]" : "bg-red-400"
                    }`}
                    style={{ width: `${currency.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Volatility Index
          </h2>
          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className={`text-2xl font-semibold ${volatilityTextColor}`}>
                {volatility.label}
              </p>
              <p className="text-xs text-gray-500">{volatility.detail}</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full ${
                  volatility.label === "High" ? "bg-red-400" : "bg-[var(--accent)]"
                }`}
                style={volatilityMeterStyle}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-gray-600">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Global Risk Sentiment
          </h2>
          <div className="mt-3 flex flex-col items-center">
            <div className="relative h-20 w-36 overflow-hidden">
              <div
                className="absolute inset-x-0 top-0 h-36 rounded-full"
                style={riskGaugeStyle}
              />
              <div className="absolute inset-x-4 top-4 h-28 rounded-full bg-gray-950" />
              <div className="absolute inset-x-0 bottom-0 text-center">
                <p className="text-lg font-semibold text-white">
                  {riskSentiment.label}
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round(riskSentiment.score)} / 100
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              Investors seeking: {riskSentiment.seeking}
            </p>
          </div>
        </section>
      </div>

      {/* Market Monitoring */}
      <div className="grid items-stretch gap-3 xl:grid-cols-12">
        <section className="min-w-0 rounded-lg border border-gray-800 bg-gray-950/40 xl:col-span-6">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Major Currency Pairs
            </h2>
            <span className="text-[11px] text-gray-600">Live monitor</span>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-gray-600">
                <tr className="border-b border-gray-800">
                  <th className="w-[18%] px-2 py-2 font-medium">Pair</th>
                  <th className="w-[20%] px-2 py-2 font-medium">Price</th>
                  <th className="w-[16%] px-2 py-2 font-medium">Change</th>
                  <th className="hidden w-[15%] px-2 py-2 font-medium 2xl:table-cell">
                    Spread
                  </th>
                  <th className="hidden w-[12%] px-2 py-2 font-medium 2xl:table-cell">
                    Trend
                  </th>
                  <th className="w-[14%] px-2 py-2 font-medium">Signal</th>
                  <th className="w-[18%] px-2 py-2 font-medium">Spark</th>
                </tr>
              </thead>
              <tbody>
                {majorPairRows.map((row) => (
                  <tr key={row.pair} className="border-b border-gray-900 last:border-0">
                    <td className="truncate px-2 py-2 font-medium text-white">{row.pair}</td>
                    <td className="truncate px-2 py-2 font-mono text-gray-300">
                      {row.price ? Number(row.price).toFixed(row.pair.includes("JPY") ? 3 : 5) : "..."}
                    </td>
                    <td
                      className={`truncate px-2 py-2 font-mono ${
                        row.change >= 0 ? "text-[var(--accent)]" : "text-red-400"
                      }`}
                    >
                      {row.change >= 0 ? "+" : ""}
                      {row.change.toFixed(3)}%
                    </td>
                    <td className="hidden px-2 py-2 text-gray-500 2xl:table-cell">
                      {row.spread}
                    </td>
                    <td className="hidden px-2 py-2 text-gray-400 2xl:table-cell">
                      {row.trend}
                    </td>
                    <td
                      className={`px-2 py-2 font-semibold ${
                        row.signal === "Sell"
                          ? "text-red-400"
                          : row.signal === "Buy"
                            ? "text-[var(--accent)]"
                            : "text-gray-500"
                      }`}
                    >
                      {row.signal}
                    </td>
                    <td className="px-2 py-2">
                      <svg className="h-6 w-full" viewBox="0 0 72 24" aria-hidden="true">
                        {row.sparkline ? (
                          <polyline
                            fill="none"
                            points={row.sparkline}
                            stroke={row.change >= 0 ? "var(--accent)" : "#f87171"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : (
                          <line x1="0" x2="72" y1="12" y2="12" stroke="#374151" />
                        )}
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-gray-800 bg-gray-950/40 p-3 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Currency Heatmap
            </h2>
            <span className="text-[11px] text-gray-600">{heatmapStrengthLabel}</span>
          </div>
          <div className="mt-3 grid grid-cols-[1.35rem_repeat(5,minmax(0,1fr))] gap-1 text-[10px]">
            <div />
            {HEATMAP_CURRENCIES.map((currency) => (
              <div key={currency.code} className="text-center text-gray-500">
                {currency.code}
              </div>
            ))}
            {heatmapRows.map((row, rowIndex) => (
              <div key={HEATMAP_CURRENCIES[rowIndex].code} className="contents">
                <div className="flex items-center justify-center text-gray-500">
                  {HEATMAP_CURRENCIES[rowIndex].code}
                </div>
                {row.map((cell) => {
                  const isSelf = cell.base.code === cell.quote.code;
                  const isStrong = cell.value >= 0;
                  const intensity = clamp(Math.abs(cell.value) * 2200, 10, 82);
                  return (
                    <div
                      key={cell.label}
                      className={`flex h-9 items-center justify-center rounded border text-[9px] font-semibold ${
                        isSelf
                          ? "border-gray-800 bg-gray-900/60 text-gray-700"
                          : isStrong
                            ? "border-[var(--border-soft)] text-gray-950"
                            : "border-red-400/20 text-red-100"
                      }`}
                      title={`${cell.label}: ${cell.value >= 0 ? "+" : ""}${cell.value.toFixed(3)}%`}
                      style={{
                        backgroundColor: isSelf
                          ? undefined
                          : isStrong
                            ? `rgb(207 204 209 / ${intensity / 100})`
                            : `rgb(248 113 113 / ${intensity / 100})`,
                      }}
                    >
                      {isSelf ? "-" : `${cell.value >= 0 ? "+" : ""}${cell.value.toFixed(2)}`}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-600">
              <span>Weak</span>
              <span>{Math.round(heatmapScore)}%</span>
              <span>Strong</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gradient-to-r from-red-400 via-gray-700 to-[var(--accent)]">
              <div
                className="h-3 w-1 rounded-full bg-white"
                style={{ marginLeft: `calc(${heatmapScore}% - 2px)` }}
              />
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-gray-800 bg-gray-950/40 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Economic Calendar
            </h2>
            <span className="text-[11px] text-gray-600">Countdown</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2 text-[11px] text-gray-500">
            <span>
              {nextHighImpactEvent
                ? `Next high impact: ${nextHighImpactEvent.title}`
                : "No high-impact event scheduled"}
            </span>
            <span>
              {nextHighImpactCountdown
                ? `${nextHighImpactCountdown} remaining`
                : ""}
            </span>
          </div>
          <div className="space-y-2 p-3">
            {upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-600">
                No upcoming events loaded
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={`${event.date}-${event.time}-${event.title}`}
                  className="rounded-md border border-gray-800 bg-gray-900/70 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {event.country} • {event.time || "Time pending"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-semibold ${
                          event.impact === "High"
                            ? "text-red-400"
                            : event.impact === "Medium"
                              ? "text-yellow-400"
                              : "text-[var(--accent)]"
                        }`}
                      >
                        {event.impact || "Event"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatCountdown(event.eventDate, utcNow)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 xl:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                AI Insights & Opportunities
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Modernized market intelligence.
              </p>
            </div>
            <span className="text-[11px] text-[var(--accent)]">10</span>
          </div>
          <div className="mt-4 space-y-3">
            {aiInsights.map((insight, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-800 bg-gray-900/70 p-3 text-sm text-gray-200"
              >
                {insight}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 xl:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Portfolio Overview
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Trader financial health center.
              </p>
            </div>
            <span className="text-[11px] text-[var(--accent)]">11</span>
          </div>
          <div className="mt-4 grid gap-3">
            {[
              {
                label: "Account Balance",
                value: `$${accountBalance.toLocaleString()}`,
                sub: "Fixed capital amount",
              },
              {
                label: "Equity",
                value: `$${equity.toFixed(2)}`,
                sub: "Includes floating P/L",
              },
              {
                label: "Margin Usage",
                value: `${marginUsage.toFixed(1)}%`,
                sub: "Estimated leverage exposure",
              },
              {
                label: "USD Exposure",
                value: `${usdExposurePercent.toFixed(0)}%`,
                sub: "Concentration in USD",
              },
              {
                label: "Drawdown",
                value: `${drawdownPercent.toFixed(1)}%`,
                sub: "Loss from peak equity",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-gray-900 border border-gray-800 p-4"
              >
                <p className="text-[11px] text-gray-500">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                <p className="text-[11px] text-gray-500 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 xl:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Sentiment & News Panel
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Market psychology intelligence.
              </p>
            </div>
            <span className="text-[11px] text-[var(--accent)]">12</span>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <p className="text-[11px] text-gray-500">Retail Positioning</p>
              <p className="mt-2 text-sm font-semibold text-white">{retailPositioning.label}</p>
              <p className="mt-1 text-[11px] text-gray-500">{retailPositioning.detail}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <p className="text-[11px] text-gray-500">News Sentiment</p>
              <p className="mt-2 text-sm font-semibold text-white">{newsSentiment}</p>
              <p className="mt-1 text-[11px] text-gray-500">
                {newsLoading ? "Analyzing headlines..." : "AI scoring from latest news"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-500">Top News Feed</p>
                <span className="text-[11px] text-gray-500">{newsItems.length} items</span>
              </div>
              <div className="mt-3 space-y-2">
                {newsLoading ? (
                  <p className="text-xs text-gray-500">Loading news...</p>
                ) : newsItems.length === 0 ? (
                  <p className="text-xs text-gray-500">No news available</p>
                ) : (
                  newsItems.slice(0, 3).map((article, idx) => (
                    <p key={idx} className="text-sm text-gray-200">
                      {article.title}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Market Movers Panel
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Biggest gainers, losers and volatility.
            </p>
          </div>
          <span className="text-[11px] text-[var(--accent)]">13</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[
            { title: "Biggest Gainers", rows: gainers },
            { title: "Biggest Losers", rows: losers },
            { title: "Most Volatile", rows: mostVolatile },
          ].map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4"
            >
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">
                {group.title}
              </p>
              <div className="mt-3 space-y-2">
                {group.rows.length === 0 ? (
                  <p className="text-xs text-gray-500">Waiting for data</p>
                ) : (
                  group.rows.map((row) => (
                    <div
                      key={row.pair}
                      className="flex items-center justify-between text-sm text-gray-200"
                    >
                      <span>{row.pair}</span>
                      <span
                        className={row.change >= 0 ? "text-[var(--accent)]" : "text-red-400"}
                      >
                        {row.change >= 0 ? "+" : ""}
                        {row.change.toFixed(2)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Account Balance",
            value: `$${(session?.user.balance || 0).toLocaleString()}`,
            sub: "Available funds",
            color: "text-[var(--accent)]",
          },
          {
            label: "Total P&L",
            value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`,
            sub: `${closedTrades.length} closed trades`,
            color: totalProfit >= 0 ? "text-[var(--accent)]" : "text-red-400",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            sub: `${winningTrades.length} of ${closedTrades.length} trades`,
            color: winRate >= 50 ? "text-[var(--accent)]" : "text-red-400",
          },
          {
            label: "Open Trades",
            value: openTrades.length.toString(),
            sub: "Currently active",
            color: "text-blue-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-500 text-xs mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-600 text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Live Prices + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Prices */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Live Prices</h2>
            <Link
              href="/markets"
              className="text-[var(--accent)] text-xs hover:underline"
            >
              View all →
            </Link>
          </div>

          {quotesLoading ? (
            <p className="text-gray-600 text-sm">Loading prices...</p>
          ) : (
            <div className="space-y-3">
              {quotes.slice(0, 5).map((quote) => (
                <div
                  key={quote.pair}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-medium">
                      {quote.pair.split("/")[0]}
                    </div>
                    <span className="text-sm text-white font-medium">
                      {quote.pair}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--accent)] font-mono font-bold">
                    {parseFloat(quote.price).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trades */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Trades</h2>
            <Link
              href="/journal"
              className="text-[var(--accent)] text-xs hover:underline"
            >
              View all →
            </Link>
          </div>

          {tradesLoading ? (
            <p className="text-gray-600 text-sm">Loading trades...</p>
          ) : trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">No trades logged yet</p>
              <Link
                href="/journal"
                className="text-[var(--accent)] text-xs hover:underline mt-2 inline-block"
              >
                Log your first trade
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {trades.slice(0, 5).map((trade) => (
                <div
                  key={trade._id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">
                        {trade.pair}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          trade.type === "buy"
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-red-400/10 text-red-400"
                        }`}
                      >
                        {trade.type.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          trade.status === "open"
                            ? "bg-blue-400/10 text-blue-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {trade.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Entry: {trade.entryPrice} · Lot: {trade.lotSize}
                    </p>
                  </div>
                  {trade.profit !== undefined && (
                    <span
                      className={`text-sm font-bold ${
                        trade.profit >= 0 ? "text-[var(--accent)]" : "text-red-400"
                      }`}
                    >
                      {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
