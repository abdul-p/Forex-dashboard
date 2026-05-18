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

const FOREX_SESSIONS: SessionBlock[] = [
  { name: "Sydney", start: 22, end: 7 },
  { name: "Tokyo", start: 0, end: 9 },
  { name: "London", start: 8, end: 17 },
  { name: "New York", start: 13, end: 22 },
];

const pad = (value: number) => value.toString().padStart(2, "0");

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
  if (atrPercent === null) return { label: "Loading", detail: "ATR pending" };
  if (atrPercent >= 0.35) return { label: "High", detail: `${atrPercent.toFixed(2)}% ATR` };
  if (atrPercent >= 0.18) return { label: "Moderate", detail: `${atrPercent.toFixed(2)}% ATR` };
  return { label: "Low", detail: `${atrPercent.toFixed(2)}% ATR` };
};

const getRiskSentiment = (changes: Record<string, number>) => {
  const hasMovement = ["AUD/USD", "GBP/USD", "USD/JPY", "USD/CHF"].some(
    (pair) => changes[pair] !== undefined,
  );
  const growthCurrencies =
    (changes["AUD/USD"] || 0) + (changes["GBP/USD"] || 0);
  const safetyCurrencies =
    (changes["USD/JPY"] || 0) + (changes["USD/CHF"] || 0);

  if (!hasMovement) {
    return { label: "Neutral", detail: "Waiting for price movement" };
  }
  if (growthCurrencies > Math.abs(safetyCurrencies)) {
    return { label: "Risk-On", detail: "AUD/GBP bid" };
  }
  if (safetyCurrencies > Math.abs(growthCurrencies)) {
    return { label: "Risk-Off", detail: "USD/JPY/CHF bid" };
  }
  return { label: "Neutral", detail: "Mixed currency flow" };
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
        if (previousPrice) nextChanges[quote.pair] = price - previousPrice;
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
  const riskSentiment = getRiskSentiment(quoteChanges);
  const marketCards = [
    {
      label: "Forex Market",
      value: forexMarketState,
      detail: forexMarketState === "Open" ? "24/5 liquidity" : "Weekend pause",
    },
    {
      label: "Active Session",
      value:
        openSessions.length > 1 ? overlapText : currentSession?.name || "Closed",
      detail: currentSessionRemaining,
    },
    {
      label: "Volatility",
      value: volatility.label,
      detail: volatility.detail,
    },
    {
      label: "Risk Sentiment",
      value: riskSentiment.label,
      detail: riskSentiment.detail,
    },
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
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-800 bg-gray-950/40 p-3 lg:grid-cols-4">
        {marketCards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-gray-800 bg-gray-900/70 px-3 py-2"
          >
            <p className="text-[11px] uppercase tracking-wide text-gray-500">
              {card.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {card.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {card.detail}
            </p>
          </div>
        ))}
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
