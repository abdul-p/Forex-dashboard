"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Camera,
  ChevronDown,
  CircleDot,
  Clock3,
  Crosshair,
  Eye,
  Layers,
  Lock,
  Magnet,
  Maximize2,
  Minus,
  MousePointer2,
  MoveHorizontal,
  PenLine,
  Plus,
  Ruler,
  Search,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from "lucide-react";
import MainChartEngine, { type ChartCandle } from "@/components/MainChartEngine";
import MarketDataPanel from "@/components/charts/MarketDataPanel";
import OpenPositionsPanel from "@/components/charts/OpenPositionsPanel";
import TechnicalAnalysisPanel from "@/components/charts/TechnicalAnalysisPanel";
import TradeExecutionPanel from "@/components/charts/TradeExecutionPanel";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP"];

const INTERVALS = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1day" },
  { label: "1W", value: "1week" },
];

const INDICATORS = ["EMA 20", "EMA 50", "EMA 200", "RSI", "MACD", "Volume"];
const DRAWING_TOOLS = [
  { label: "Cursor", icon: MousePointer2 },
  { label: "Crosshair", icon: Crosshair },
  { label: "Trendline", icon: PenLine },
  { label: "Horizontal", icon: Minus },
  { label: "Measure", icon: Ruler },
  { label: "Pattern", icon: MoveHorizontal },
  { label: "Levels", icon: SlidersHorizontal },
  { label: "Brush", icon: PenLine },
  { label: "Text", icon: Type },
  { label: "Magnet", icon: Magnet },
  { label: "Lock", icon: Lock },
  { label: "Hide", icon: Eye },
  { label: "Delete", icon: Trash2 },
];

interface Candle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

const formatInterval = (interval: string) => INTERVALS.find((item) => item.value === interval)?.label ?? interval;

export default function ChartsPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<string[]>(["EMA 20", "EMA 50", "EMA 200", "RSI", "MACD", "Volume"]);
  const [activeDrawingTool, setActiveDrawingTool] = useState("Crosshair");
  const [layoutSaved, setLayoutSaved] = useState(false);
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredPairs = PAIRS.filter((pair) => pair.toLowerCase().includes(pairSearch.toLowerCase()));

  const toggleIndicator = (indicator: string) => {
    setActiveIndicators((current) =>
      current.includes(indicator) ? current.filter((item) => item !== indicator) : [...current, indicator],
    );
  };

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
    setPairSearch(pair);
    setPairDropdownOpen(false);
  };

  const formatTime = (datetime: string, interval: string) => {
    const date = new Date(datetime);
    if (interval === "1day" || interval === "1week") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const toTimestamp = (datetime: string) => Math.floor(new Date(datetime).getTime() / 1000) as ChartCandle["time"];

  useEffect(() => {
    let active = true;

    const fetchChartData = async () => {
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
      const existingIndex = current.findIndex((candle) => candle.time === nextCandle.time);

      return existingIndex >= 0
        ? current.map((candle, index) => (index === existingIndex ? nextCandle : candle))
        : [...current, nextCandle].sort((first, second) => first.time - second.time).slice(-500);
    });
  }, []);

  const stats = useMemo(() => {
    const latest = chartData[chartData.length - 1];
    const previous = chartData[chartData.length - 2];
    const first = chartData[0];
    const change = latest && first ? latest.close - first.close : 0;
    const tickChange = latest && previous ? latest.close - previous.close : 0;
    const changePercent = first ? ((change / first.close) * 100).toFixed(2) : "0.00";

    return {
      latest,
      previous,
      open: latest?.open.toFixed(5) ?? "----",
      high: latest?.high.toFixed(5) ?? "----",
      low: latest?.low.toFixed(5) ?? "----",
      close: latest?.close.toFixed(5) ?? null,
      tickChange: tickChange.toFixed(5),
      changePercent,
      isPositive: change >= 0,
    };
  }, [chartData]);

  const buyPrice = stats.close ?? "1.08724";
  const sellPrice = stats.latest ? (stats.latest.close - 0.00001).toFixed(5) : "1.08723";

  return (
    <div className="flex h-screen min-h-[840px] flex-col overflow-hidden bg-[#060b12] text-slate-100">
      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#07101b] px-4 shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold text-white">Charts</h1>
            <p className="text-xs text-slate-400">Advanced charting & technical analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="rounded-md border border-slate-800 bg-[#0a1421] px-3 py-1.5 text-right">
            <p className="text-[11px] text-slate-400">Demo Account</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-white">$25,430.68</span>
              <span className="text-xs font-semibold text-emerald-400">+5.21%</span>
            </div>
          </div>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-[#0a1421] text-slate-300" type="button" aria-label="Alerts">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">3</span>
          </button>
          <div className="h-8 w-px bg-slate-800" />
          <button className="flex items-center gap-2 text-sm text-slate-300" type="button">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">JT</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-14 shrink-0 flex-col items-center border-r border-slate-800/80 bg-[#07101b] py-2">
          {DRAWING_TOOLS.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                title={tool.label}
                onClick={() => setActiveDrawingTool(tool.label)}
                className={`my-1 flex h-9 w-9 items-center justify-center rounded-md transition ${
                  activeDrawingTool === tool.label
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <ToolIcon className="h-4 w-4" />
              </button>
            );
          })}
        </aside>

        <main className="grid min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_268px] border-r border-slate-800/80">
          <div className="flex h-10 items-center border-b border-slate-800/80 bg-[#090f19] text-sm">
            <div className="relative h-full w-44 border-r border-slate-800">
              <button
                type="button"
                onClick={() => setPairDropdownOpen((open) => !open)}
                className="flex h-full w-full items-center gap-2 px-3 text-left font-semibold text-white"
              >
                <Search className="h-4 w-4 text-slate-400" />
                {selectedPair}
                <Plus className="ml-auto h-4 w-4 text-slate-300" />
              </button>
              {pairDropdownOpen && (
                <div className="absolute left-2 top-11 z-30 w-56 overflow-hidden rounded-md border border-slate-700 bg-[#09111d] shadow-2xl">
                  <input
                    value={pairSearch}
                    onChange={(event) => setPairSearch(event.target.value)}
                    className="w-full border-b border-slate-800 bg-[#07101b] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600"
                    placeholder="Search pair"
                  />
                  {filteredPairs.map((pair) => (
                    <button
                      key={pair}
                      type="button"
                      onClick={() => handlePairSelect(pair)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                    >
                      {pair}
                      {pair === selectedPair && <CircleDot className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex h-full items-center border-r border-slate-800 px-2">
              {INTERVALS.map((interval) => (
                <button
                  key={interval.value}
                  type="button"
                  onClick={() => setSelectedInterval(interval.value)}
                  className={`h-7 rounded px-2 text-xs transition ${
                    selectedInterval === interval.value ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {interval.label}
                </button>
              ))}
              <ChevronDown className="ml-1 h-4 w-4 text-slate-500" />
            </div>

            <button type="button" onClick={() => setIndicatorModalOpen(true)} className="flex h-full items-center gap-2 border-r border-slate-800 px-4 text-slate-200 hover:bg-slate-800/60">
              <Activity className="h-4 w-4" />
              Indicators
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
            <button type="button" className="flex h-full items-center gap-2 border-r border-slate-800 px-4 text-slate-200 hover:bg-slate-800/60">
              <Bell className="h-4 w-4" />
              Alert
            </button>
            <button type="button" className="flex h-full items-center gap-2 border-r border-slate-800 px-4 text-slate-200 hover:bg-slate-800/60">
              <Clock3 className="h-4 w-4" />
              Replay
            </button>
            <div className="ml-auto flex h-full items-center">
              <button type="button" onClick={() => setLayoutSaved(true)} className="flex h-full items-center gap-2 border-l border-slate-800 px-4 text-slate-200 hover:bg-slate-800/60">
                <Layers className="h-4 w-4" />
                <span>Layout 1</span>
                <span className="text-[10px] text-blue-400">{layoutSaved ? "Saved" : "Save"}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              <button type="button" className="flex h-full w-10 items-center justify-center border-l border-slate-800 text-slate-300 hover:bg-slate-800/60" aria-label="Snapshot">
                <Camera className="h-4 w-4" />
              </button>
              <button type="button" className="flex h-full w-10 items-center justify-center border-l border-slate-800 text-slate-300 hover:bg-slate-800/60" aria-label="Fullscreen">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0">
            <MainChartEngine
              candles={chartData}
              selectedPair={selectedPair}
              selectedInterval={selectedInterval}
              chartType="Candlestick"
              activeIndicators={activeIndicators}
              loading={loading}
              onLiveCandle={handleLiveCandle}
            />
          </div>

          <div className="min-h-0 border-t border-slate-800 bg-[#07101b]">
            <OpenPositionsPanel />
          </div>
        </main>

        <aside className="flex w-[340px] shrink-0 flex-col gap-2 overflow-y-auto bg-[#07101b] p-2">
          <MarketDataPanel
            pair={selectedPair}
            price={stats.close}
            changePercent={stats.changePercent}
            changeValue={stats.tickChange}
            isPositive={stats.isPositive}
            high={chartData.length > 0 ? Math.max(...chartData.map((d) => d.high)).toFixed(5) : ""}
            low={chartData.length > 0 ? Math.min(...chartData.map((d) => d.low)).toFixed(5) : ""}
          />
          <TechnicalAnalysisPanel />
          <TradeExecutionPanel buyPrice={buyPrice} sellPrice={sellPrice} />
        </aside>
      </div>

      {indicatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-[#07101b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Indicators</h2>
                <p className="text-xs text-slate-400">{formatInterval(selectedInterval)} studies on {selectedPair}</p>
              </div>
              <button
                type="button"
                onClick={() => setIndicatorModalOpen(false)}
                aria-label="Close indicators"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 p-4">
              {INDICATORS.map((indicator) => (
                <label key={indicator} className="flex cursor-pointer items-center justify-between rounded-md border border-slate-800 bg-[#0a1421] px-3 py-2 text-sm text-slate-200">
                  <span>{indicator}</span>
                  <input
                    type="checkbox"
                    checked={activeIndicators.includes(indicator)}
                    onChange={() => toggleIndicator(indicator)}
                    className="h-4 w-4 accent-blue-600"
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
