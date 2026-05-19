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

export default function OverviewPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteChanges, setQuoteChanges] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [marketCandles, setMarketCandles] = useState<Candle[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [utcNow, setUtcNow] = useState(() => new Date());
  const previousPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    fetchQuotes();
    fetchTrades();
    fetchCalendar();
    fetchMarketCandles();
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
