"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  CandlestickChart,
  ChevronDown,
  Columns2,
  Expand,
  LineChart as LineChartIcon,
  PenLine,
  Save,
  Search,
  SlidersHorizontal,
  Square,
  TrendingUp,
  X,
} from "lucide-react";
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
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1day" },
  { label: "1W", value: "1week" },
];

const CHART_TYPES = [
  { label: "Candlestick", icon: CandlestickChart },
  { label: "Line", icon: LineChartIcon },
  { label: "Area", icon: Activity },
  { label: "Heikin Ashi", icon: BarChart3 },
];

const INDICATORS = ["RSI", "MACD", "EMA", "Bollinger Bands"];

const DRAWING_TOOLS = [
  { label: "Trendline", icon: PenLine },
  { label: "Fibonacci", icon: TrendingUp },
  { label: "Rectangle", icon: Square },
  { label: "Support/Resistance", icon: SlidersHorizontal },
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
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [chartType, setChartType] = useState("Line");
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["EMA"]);
  const [activeDrawingTool, setActiveDrawingTool] = useState("Trendline");
  const [splitCharts, setSplitCharts] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<string | null>(null);

  const filteredPairs = PAIRS.filter((pair) =>
    pair.toLowerCase().includes(pairSearch.toLowerCase()),
  );

  const toggleIndicator = (indicator: string) => {
    setActiveIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator],
    );
  };

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
    setPairSearch(pair);
    setPairDropdownOpen(false);
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

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/market/timeseries?symbol=${encodeURIComponent(selectedPair)}&interval=${selectedInterval}`,
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

  useEffect(() => {
    fetchChartData();
  }, [selectedPair, selectedInterval]);

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

      {/* Top Toolbar */}
      <div className="rounded-lg border border-gray-800 bg-gray-950/40">
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(13rem,1.2fr)_auto_auto_auto_auto]">
          <div className="relative min-w-0">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Pair
            </label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-gray-800 bg-gray-900/80 px-3">
              <Search className="h-4 w-4 shrink-0 text-gray-500" />
              <input
                value={pairSearch}
                onChange={(event) => {
                  setPairSearch(event.target.value);
                  setPairDropdownOpen(true);
                }}
                onFocus={() => setPairDropdownOpen(true)}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-gray-600"
                placeholder="Search pair"
              />
              <button
                type="button"
                onClick={() => setPairDropdownOpen((open) => !open)}
                aria-label="Toggle pair list"
                className="text-gray-500 transition hover:text-white"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {pairDropdownOpen && (
              <div className="absolute left-0 right-0 top-[4.2rem] z-20 overflow-hidden rounded-md border border-gray-800 bg-gray-950 shadow-xl">
                {filteredPairs.length > 0 ? (
                  filteredPairs.map((pair) => (
                    <button
                      key={pair}
                      type="button"
                      onMouseDown={() => handlePairSelect(pair)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-gray-900 ${
                        selectedPair === pair ? "text-white" : "text-gray-400"
                      }`}
                    >
                      <span>{pair}</span>
                      {selectedPair === pair && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-gray-500">
                    No pair found
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Timeframe
            </p>
            <div className="flex h-10 overflow-hidden rounded-md border border-gray-800 bg-gray-900/80">
              {INTERVALS.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => setSelectedInterval(interval.value)}
                  className={`min-w-9 px-2 text-xs font-semibold transition ${
                    selectedInterval === interval.value
                      ? "bg-[var(--accent)] text-gray-950"
                      : "text-gray-500 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Chart Type
            </p>
            <div className="flex h-10 overflow-hidden rounded-md border border-gray-800 bg-gray-900/80">
              {CHART_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.label}
                    type="button"
                    title={type.label}
                    onClick={() => setChartType(type.label)}
                    className={`flex min-w-10 items-center justify-center px-2 transition ${
                      chartType === type.label
                        ? "bg-[var(--accent)] text-gray-950"
                        : "text-gray-500 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Indicators
            </p>
            <button
              type="button"
              onClick={() => setIndicatorModalOpen(true)}
              className="flex h-10 items-center gap-2 rounded-md border border-gray-800 bg-gray-900/80 px-3 text-sm font-medium text-gray-300 transition hover:border-gray-700 hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeIndicators.length} active
            </button>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Layout
            </p>
            <div className="flex h-10 overflow-hidden rounded-md border border-gray-800 bg-gray-900/80">
              <button
                type="button"
                title="Fullscreen"
                onClick={() => setFullscreen((value) => !value)}
                className={`flex min-w-10 items-center justify-center px-2 transition ${
                  fullscreen
                    ? "bg-[var(--accent)] text-gray-950"
                    : "text-gray-500 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Expand className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Split charts"
                onClick={() => setSplitCharts((value) => !value)}
                className={`flex min-w-10 items-center justify-center px-2 transition ${
                  splitCharts
                    ? "bg-[var(--accent)] text-gray-950"
                    : "text-gray-500 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Columns2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Save layout"
                onClick={() => setLayoutSaved(true)}
                className={`flex min-w-10 items-center justify-center px-2 transition ${
                  layoutSaved
                    ? "bg-[var(--accent)] text-gray-950"
                    : "text-gray-500 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-gray-800 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Drawing Tools
          </span>
          {DRAWING_TOOLS.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                onClick={() => setActiveDrawingTool(tool.label)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                  activeDrawingTool === tool.label
                    ? "border-[var(--border-soft)] bg-[var(--accent-soft)] text-white"
                    : "border-gray-800 bg-gray-900/70 text-gray-500 hover:border-gray-700 hover:text-white"
                }`}
              >
                <ToolIcon className="h-3.5 w-3.5" />
                {tool.label}
              </button>
            );
          })}
        </div>
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
                  className={`text-sm font-medium ${isPositive ? "text-[var(--accent)]" : "text-red-400"}`}
                >
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(5)} ({isPositive ? "+" : ""}
                  {priceChangePercent}%)
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">Mode</p>
            <p className="text-sm font-semibold text-white">{chartType}</p>
            <p className="mt-1 text-[11px] text-gray-500">
              {activeIndicators.join(", ") || "No indicators"}
            </p>
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
                formatter={(value) => [Number(value).toFixed(5), "Price"]}
                labelStyle={{ color: "#6b7280" }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={isPositive ? "var(--accent)" : "#f87171"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isPositive ? "var(--accent)" : "#f87171" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {indicatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Indicators
                </h2>
                <p className="text-xs text-gray-500">
                  Add studies to the active chart.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIndicatorModalOpen(false)}
                aria-label="Close indicators"
                className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 p-4">
              {INDICATORS.map((indicator) => (
                <label
                  key={indicator}
                  className="flex cursor-pointer items-center justify-between rounded-md border border-gray-800 bg-gray-900/70 px-3 py-2 text-sm text-gray-300"
                >
                  <span>{indicator}</span>
                  <input
                    type="checkbox"
                    checked={activeIndicators.includes(indicator)}
                    onChange={() => toggleIndicator(indicator)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

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
