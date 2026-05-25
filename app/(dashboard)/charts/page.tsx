"use client";

import { useCallback, useEffect, useState } from "react";
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
import MainChartEngine, { type ChartCandle } from "@/components/MainChartEngine";
import MarketDataPanel from "@/components/charts/MarketDataPanel";
import TechnicalAnalysisPanel from "@/components/charts/TechnicalAnalysisPanel";
import TradeExecutionPanel from "@/components/charts/TradeExecutionPanel";
import OpenPositionsPanel from "@/components/charts/OpenPositionsPanel";

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

const INDICATORS = ["EMA 20", "EMA 50", "VWAP", "RSI", "MACD"];

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

export default function ChartsPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [chartType, setChartType] = useState("Candlestick");
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([
    "EMA 20",
    "EMA 50",
    "RSI",
  ]);
  const [activeDrawingTool, setActiveDrawingTool] = useState("Trendline");
  const [splitCharts, setSplitCharts] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(true);

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

  const toTimestamp = (datetime: string) =>
    Math.floor(new Date(datetime).getTime() / 1000) as ChartCandle["time"];

  useEffect(() => {
    let active = true;

    const fetchChartData = async () => {
      await Promise.resolve();
      if (!active) {
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/market/timeseries?symbol=${encodeURIComponent(selectedPair)}&interval=${selectedInterval}`,
        );
        const data = await res.json();

        if (active && data.values) {
          const formatted: ChartCandle[] = data.values
            .slice()
            .reverse()
            .map((candle: Candle) => ({
              time: toTimestamp(candle.datetime),
              label: formatTime(candle.datetime, selectedInterval),
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close),
            }));

          setChartData(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchChartData();

    return () => {
      active = false;
    };
  }, [selectedPair, selectedInterval]);

  const handleLiveCandle = useCallback((nextCandle: ChartCandle) => {
    setChartData((current) => {
      const existingIndex = current.findIndex(
        (candle) => candle.time === nextCandle.time,
      );

      return existingIndex >= 0
        ? current.map((candle, index) =>
            index === existingIndex ? nextCandle : candle,
          )
        : [...current, nextCandle]
            .sort((first, second) => first.time - second.time)
            .slice(-500);
    });
  }, []);

  const priceChange =
    chartData.length > 1
      ? chartData[chartData.length - 1].close - chartData[0].close
      : 0;

  const priceChangePercent =
    chartData.length > 1
      ? ((priceChange / chartData[0].close) * 100).toFixed(3)
      : "0.000";

  const isPositive = priceChange >= 0;
  const currentPrice = chartData[chartData.length - 1]?.close.toFixed(5) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] space-y-4 pt-2 pb-4">
      {/* Top Toolbar */}
      <div className="shrink-0 rounded-lg border border-gray-800 bg-gray-950/40">
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(13rem,1.2fr)_auto_auto_auto_auto]">
          {/* Pair Selector */}
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
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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

          {/* Timeframe Selector */}
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
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-gray-500 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {interval.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type Selector */}
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
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-gray-500 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Indicators Button */}
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

          {/* Layout Controls */}
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
                    ? "bg-emerald-500/20 text-emerald-400"
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
                    ? "bg-emerald-500/20 text-emerald-400"
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
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-gray-500 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Save className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Drawing Tools */}
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
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
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

      {/* Main Content Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Chart Engine */}
        <div className="flex flex-col min-h-0 rounded-lg border border-gray-800 bg-gray-950/40 p-1">
          <MainChartEngine
            candles={chartData}
            selectedPair={selectedPair}
            selectedInterval={selectedInterval}
            chartType={chartType}
            activeIndicators={activeIndicators}
            loading={loading}
            onLiveCandle={handleLiveCandle}
          />
        </div>

        {/* Right: Side Panels */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <MarketDataPanel
            pair={selectedPair}
            price={currentPrice}
            changePercent={priceChangePercent}
            isPositive={isPositive}
            high={chartData.length > 0 ? Math.max(...chartData.map((d) => d.high)).toFixed(5) : ""}
            low={chartData.length > 0 ? Math.min(...chartData.map((d) => d.low)).toFixed(5) : ""}
          />
          <TechnicalAnalysisPanel />
          <TradeExecutionPanel />
        </div>
      </div>

      {/* Bottom: Open Positions */}
      <div className="shrink-0 h-52">
        <OpenPositionsPanel />
      </div>

      {/* Indicator Modal */}
      {indicatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Indicators</h2>
                <p className="text-xs text-gray-500">Add studies to the active chart.</p>
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
                    className="h-4 w-4 accent-emerald-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
