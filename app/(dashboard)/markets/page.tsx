"use client";

import { useState, useEffect } from "react";

interface Quote {
  pair: string;
  price: string;
  previousClose?: string;
}

const PAIR_INFO: Record<string, { base: string; quote: string; flag: string }> =
  {
    "EUR/USD": { base: "EUR", quote: "USD", flag: "🇪🇺" },
    "GBP/USD": { base: "GBP", quote: "USD", flag: "🇬🇧" },
    "USD/JPY": { base: "USD", quote: "JPY", flag: "🇺🇸" },
    "USD/CHF": { base: "USD", quote: "CHF", flag: "🇺🇸" },
    "AUD/USD": { base: "AUD", quote: "USD", flag: "🇦🇺" },
    "USD/CAD": { base: "USD", quote: "CAD", flag: "🇺🇸" },
    "NZD/USD": { base: "NZD", quote: "USD", flag: "🇳🇿" },
    "EUR/GBP": { base: "EUR", quote: "GBP", flag: "🇪🇺" },
  };

export default function MarketsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchQuotes();
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
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (filter === "all") return true;
    if (filter === "usd") return q.pair.includes("USD");
    if (filter === "eur") return q.pair.includes("EUR");
    if (filter === "gbp") return q.pair.includes("GBP");
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Markets</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Loading..."}
          </p>
        </div>
        <button
          onClick={fetchQuotes}
          className="border border-gray-700 text-gray-400 px-4 py-2 rounded-xl text-sm hover:bg-gray-800 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "usd", "eur", "gbp"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium uppercase transition ${
              filter === f
                ? "bg-green-400 text-gray-950"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Quotes Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-600">
          Loading live prices...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredQuotes.map((quote) => {
            const info = PAIR_INFO[quote.pair];
            return (
              <div
                key={quote.pair}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-green-400/30 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{info?.flag}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {quote.pair}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {info?.base} / {info?.quote}
                      </p>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>

                <p className="text-2xl font-bold text-white font-mono">
                  {parseFloat(quote.price).toFixed(4)}
                </p>

                <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-600">Live price</span>
                  <span className="text-xs text-green-400 font-medium">
                    ● LIVE
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
