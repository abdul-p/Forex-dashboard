"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

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

export default function OverviewPage() {
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [tradesLoading, setTradesLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
    fetchTrades();
    const interval = setInterval(fetchQuotes, 60000);
    return () => clearInterval(interval);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
                ? "afternoon"
                : "evening"}
            , {session?.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/journal"
          className="bg-green-400 text-gray-950 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-300 transition"
        >
          + Log Trade
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Account Balance",
            value: `$${(session?.user.balance || 0).toLocaleString()}`,
            sub: "Available funds",
            color: "text-green-400",
          },
          {
            label: "Total P&L",
            value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`,
            sub: `${closedTrades.length} closed trades`,
            color: totalProfit >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            sub: `${winningTrades.length} of ${closedTrades.length} trades`,
            color: winRate >= 50 ? "text-green-400" : "text-red-400",
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
              className="text-green-400 text-xs hover:underline"
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
                  <span className="text-sm text-green-400 font-mono font-bold">
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
              className="text-green-400 text-xs hover:underline"
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
                className="text-green-400 text-xs hover:underline mt-2 inline-block"
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
                            ? "bg-green-400/10 text-green-400"
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
                        trade.profit >= 0 ? "text-green-400" : "text-red-400"
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
