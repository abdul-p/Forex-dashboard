"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Bell,
  Clock3,
  Globe,
  ShieldAlert,
  Timer,
  Waves,
} from "lucide-react";

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

type SessionBlock = {
  name: string;
  start: number;
  end: number;
  accent: string;
};

const FOREX_SESSIONS: SessionBlock[] = [
  { name: "Sydney", start: 22, end: 7, accent: "bg-slate-500/15 text-slate-200" },
  { name: "Tokyo", start: 0, end: 9, accent: "bg-zinc-500/15 text-zinc-200" },
  {
    name: "London",
    start: 8,
    end: 17,
    accent: "bg-stone-500/15 text-stone-200",
  },
  {
    name: "New York",
    start: 13,
    end: 22,
    accent: "bg-neutral-500/15 text-neutral-200",
  },
];

const NOTIFICATIONS = [
  "High impact news",
  "Margin warnings",
  "Price breakouts",
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

export default function OverviewPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [utcNow, setUtcNow] = useState(() => new Date());

  useEffect(() => {
    fetchQuotes();
    fetchTrades();
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
  const openSessions = FOREX_SESSIONS.filter((block) =>
    sessionIsOpen(utcHour, block.start, block.end),
  );
  const currentSession =
    openSessions.find((block) => block.name === "London") ||
    openSessions[0] ||
    FOREX_SESSIONS.find((block) => sessionIsOpen(utcHour, block.start, block.end));
  const currentSessionRemaining = currentSession
    ? formatRemaining(
        sessionRemaining(utcHour, utcMinute, currentSession.start, currentSession.end),
      )
    : "Session closed";
  const overlapText = overlapLabel(openSessions.map((block) => block.name));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">FXPro</span>
              <span className="text-gray-600">/</span>
              <span className="truncate font-medium text-gray-300">
                {userName}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Market environment awareness, session timing, and alert status.
            </p>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-800 text-gray-400 transition hover:border-gray-700 hover:text-white"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.9fr_0.85fr]">
          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
              <Globe className="h-4 w-4" />
              Trading Sessions
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {FOREX_SESSIONS.map((block) => {
                const isOpen = sessionIsOpen(utcHour, block.start, block.end);
                return (
                  <div
                    key={block.name}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isOpen
                        ? "border-[var(--border-soft)] bg-[var(--accent-soft)] text-white"
                        : "border-gray-800 bg-gray-950/30 text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{block.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${block.accent}`}
                      >
                        {isOpen ? "Open" : "Closed"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {pad(block.start)}:00 - {pad(block.end)}:00 UTC
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 text-gray-300">
                <Waves className="h-4 w-4" />
                {overlapText}
              </div>
              <p className="mt-1">
                London + New York overlap usually delivers the highest liquidity
                and widest opportunity range.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
              <Clock3 className="h-4 w-4" />
              Date + Time
            </div>
            <div className="mt-4">
              <p className="text-3xl font-semibold text-white">{utcTimeLabel}</p>
              <p className="mt-1 text-sm text-gray-400">{utcDayLabel}</p>
            </div>
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-xs text-gray-400">
              Timing matters because macro events and session transitions can
              change spread, momentum, and breakout probability quickly.
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-500">
              <ShieldAlert className="h-4 w-4" />
              Notifications
            </div>
            <div className="mt-4 space-y-3">
              {NOTIFICATIONS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-sm text-gray-200"
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-xs text-gray-400">
              <Timer className="h-4 w-4 text-[var(--accent)]" />
              {currentSession ? (
                <span>
                  {currentSession.name} session is open, {currentSessionRemaining}.
                </span>
              ) : (
                <span>No major session is open right now.</span>
              )}
            </div>
          </div>
        </div>
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
