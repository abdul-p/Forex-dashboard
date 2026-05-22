"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FixedMarketTickerProps = {
  sidebarOpen: boolean;
};

type MarketQuote = {
  price?: string;
};

type TickerItem = {
  label: string;
  value: string;
  change?: string;
  tone: string;
  dot: string;
};

const orderedPairs = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
];

const fallbackItems: TickerItem[] = [
  {
    label: "Market Update",
    value: "Connecting to live market feed",
    tone: "text-green-400",
    dot: "bg-green-400",
  },
];

const formatPrice = (pair: string, price: string) => {
  const numericPrice = Number(price);
  if (!numericPrice) return price || "...";
  return numericPrice.toFixed(pair.includes("JPY") ? 3 : 5);
};

const getTone = (change: number) => {
  if (change < 0) return { text: "text-red-400", dot: "bg-red-400" };
  if (change > 0) return { text: "text-green-400", dot: "bg-green-400" };
  return { text: "text-gray-400", dot: "bg-gray-500" };
};

export default function FixedMarketTicker({
  sidebarOpen,
}: FixedMarketTickerProps) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const previousPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;

    const fetchMarketQuotes = async () => {
      try {
        const response = await fetch("/api/market");
        const data = (await response.json()) as Record<string, MarketQuote>;
        if (!isMounted) return;

        const nextPrices: Record<string, number> = {};
        const nextChanges: Record<string, number> = {};

        Object.entries(data).forEach(([pair, quote]) => {
          const price = Number(quote.price);
          const previousPrice = previousPricesRef.current[pair];
          if (price) {
            nextPrices[pair] = price;
          }
          if (price && previousPrice) {
            nextChanges[pair] = ((price - previousPrice) / previousPrice) * 100;
          }
        });

        previousPricesRef.current = nextPrices;
        setQuotes(data);
        setChanges(nextChanges);
        setConnected(true);
      } catch (error) {
        console.error("Failed to fetch ticker data:", error);
        if (isMounted) setConnected(false);
      }
    };

    fetchMarketQuotes();
    const interval = setInterval(fetchMarketQuotes, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const tickerItems = useMemo<TickerItem[]>(() => {
    const quotePairs = orderedPairs.filter((pair) => quotes[pair]?.price);
    const activePairs = quotePairs.length ? quotePairs : Object.keys(quotes);

    const pairItems = activePairs.slice(0, 8).map((pair) => {
      const change = changes[pair] || 0;
      const tone = getTone(change);
      return {
        label: pair,
        value: formatPrice(pair, quotes[pair]?.price || ""),
        change: `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`,
        tone: tone.text,
        dot: tone.dot,
      };
    });

    if (!pairItems.length) return fallbackItems;

    const strongestPair = pairItems
      .slice()
      .sort(
        (a, b) =>
          Math.abs(Number.parseFloat(b.change || "0")) -
          Math.abs(Number.parseFloat(a.change || "0")),
      )[0];

    return [
      {
        label: "Market Update",
        value: `${strongestPair.label} leading live momentum`,
        tone: strongestPair.tone,
        dot: strongestPair.dot,
      },
      ...pairItems,
    ];
  }, [changes, quotes]);

  return (
    <div
      className={`fixed bottom-0 right-0 z-30 border-t border-gray-800 bg-gray-950/95 backdrop-blur ${
        sidebarOpen ? "left-72" : "left-0"
      }`}
    >
      <div className="flex h-11 items-center overflow-hidden px-4 text-[11px] shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex min-w-max animate-[market-feed_32s_linear_infinite] items-center hover:[animation-play-state:paused]">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex h-7 shrink-0 items-center gap-3 border-r border-gray-800 px-5"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
              <span className="font-medium text-gray-400">{item.label}</span>
              <span className="text-gray-300">{item.value}</span>
              {item.change && (
                <span className={`font-semibold ${item.tone}`}>
                  {item.change}
                </span>
              )}
            </div>
          ))}
          <div className="flex h-7 shrink-0 items-center gap-2 px-5">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-green-400" : "bg-red-400"
              }`}
            />
            <span className="font-medium text-gray-300">
              {connected ? "Connected" : "Reconnecting"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
