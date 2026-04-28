"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/GBP",
];

const INTERVALS = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1day" },
];

interface Candle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

interface ChartPoint {
  time: string;
  price: number;
  open: number;
  high: number;
  low: number;
}

export default function ChartsPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [selectedPair, selectedInterval]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market/timeseries?symbol=${selectedPair}&interval=${selectedInterval}`,
      );
      const data = await res.json();

      if (data.values) {
        const formatted: ChartPoint[] = data.values
          .slice()
          .reverse()
          .map((candle: Candle) => ({
            time: formatTime(candle.datetime, selectedInterval),
            price: parseFloat(candle.close),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
          }));

        setChartData(formatted);
        setCurrentPrice(
          formatted[formatted.length - 1]?.price.toFixed(5) || null,
        );
      }
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (datetime: string, interval: string) => {
    const date = new Date(datetime);
    if (interval === "1day") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const priceChange =
    chartData.length > 1
      ? chartData[chartData.length - 1].price - chartData[0].price
      : 0;

  const priceChangePercent =
    chartData.length > 1
      ? ((priceChange / chartData[0].price) * 100).toFixed(3)
      : "0.000";

  const isPositive = priceChange >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Charts</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live price charts for major forex pairs
        </p>
      </div>

      {/* Pair Selector */}
      <div className="flex flex-wrap gap-2">
        {PAIRS.map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedPair === pair
                ? "bg-green-400 text-gray-950"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Chart Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {/* Chart Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">{selectedPair}</h2>
            {currentPrice && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-bold text-white font-mono">
                  {currentPrice}
                </span>
                <span
                  className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}
                >
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(5)} ({isPositive ? "+" : ""}
                  {priceChangePercent}%)
                </span>
              </div>
            )}
          </div>

          {/* Interval Selector */}
          <div className="flex gap-1">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => setSelectedInterval(interval.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedInterval === interval.value
                    ? "bg-green-400 text-gray-950"
                    : "text-gray-500 hover:text-white hover:bg-gray-800"
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-80 flex items-center justify-center text-gray-600">
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-600">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#4b5563", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(val) => val.toFixed(4)}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value: number) => [value.toFixed(5), "Price"]}
                labelStyle={{ color: "#6b7280" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "#4ade80" : "#f87171"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "#4ade80" : "#f87171" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Row */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Open", value: chartData[0]?.price.toFixed(5) },
            {
              label: "Current",
              value: chartData[chartData.length - 1]?.price.toFixed(5),
            },
            {
              label: "High",
              value: Math.max(...chartData.map((d) => d.high)).toFixed(5),
            },
            {
              label: "Low",
              value: Math.min(...chartData.map((d) => d.low)).toFixed(5),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
            >
              <p className="text-gray-500 text-xs mb-1">{stat.label}</p>
              <p className="text-white font-bold font-mono">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
