"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { io, type Socket } from "socket.io-client";

export interface ChartCandle {
  time: UTCTimestamp;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ExecutionPlan {
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  orderType?: string;
}

interface MainChartEngineProps {
  candles: ChartCandle[];
  selectedPair: string;
  selectedInterval: string;
  chartType: string;
  activeIndicators: string[];
  loading: boolean;
  onLiveCandle: (candle: ChartCandle) => void;
  executionPlan?: ExecutionPlan;
}

interface CrosshairSnapshot {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

type AnySeries = ISeriesApi<SeriesType, Time>;

const socketUrl = process.env.NEXT_PUBLIC_MARKET_SOCKET_URL;
const socketPath = process.env.NEXT_PUBLIC_MARKET_SOCKET_PATH || "/socket.io";

const formatPrice = (value: number) => value.toFixed(5);

const toLineData = (candles: ChartCandle[]): LineData<Time>[] =>
  candles.map((candle) => ({
    time: candle.time,
    value: candle.close,
  }));

const toHeikinAshi = (candles: ChartCandle[]): CandlestickData<Time>[] => {
  let previousOpen = candles[0]?.open ?? 0;
  let previousClose = candles[0]?.close ?? 0;

  return candles.map((candle, index) => {
    const close = (candle.open + candle.high + candle.low + candle.close) / 4;
    const open =
      index === 0 ? (candle.open + candle.close) / 2 : (previousOpen + previousClose) / 2;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);

    previousOpen = open;
    previousClose = close;

    return {
      time: candle.time,
      open,
      high,
      low,
      close,
    };
  });
};

const calculateEma = (candles: ChartCandle[], period: number): LineData<Time>[] => {
  if (candles.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;

  return candles.slice(period - 1).map((candle, index) => {
    if (index > 0) {
      ema = (candle.close - ema) * multiplier + ema;
    }

    return {
      time: candle.time,
      value: ema,
    };
  });
};

const calculateVwap = (candles: ChartCandle[]): LineData<Time>[] => {
  let cumulativeTypicalPrice = 0;
  let cumulativeVolume = 0;

  return candles.map((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const syntheticVolume = Math.max(candle.high - candle.low, 0.00001);

    cumulativeTypicalPrice += typicalPrice * syntheticVolume;
    cumulativeVolume += syntheticVolume;

    return {
      time: candle.time,
      value: cumulativeTypicalPrice / cumulativeVolume,
    };
  });
};

const toVolumeData = (candles: ChartCandle[]): HistogramData<Time>[] =>
  candles.map((candle, index) => {
    const previous = candles[index - 1]?.close ?? candle.open;
    const range = Math.max(candle.high - candle.low, 0.00001);
    const value = Math.round(range * 24_000_000);

    return {
      time: candle.time,
      value,
      color:
        candle.close >= previous
          ? "rgba(16, 185, 129, 0.38)"
          : "rgba(239, 68, 68, 0.42)",
    };
  });

const supportResistance = (candles: ChartCandle[]) => {
  const recent = candles.slice(-80);
  if (recent.length === 0) {
    return null;
  }

  const resistance = Math.max(...recent.map((candle) => candle.high));
  const support = Math.min(...recent.map((candle) => candle.low));

  return { resistance, support };
};

const calculateRsi = (candles: ChartCandle[], period = 14): LineData<Time>[] => {
  if (candles.length <= period) {
    return [];
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = candles[index].close - candles[index - 1].close;
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  return candles.slice(period).map((candle, sliceIndex) => {
    const sourceIndex = sliceIndex + period;

    if (sliceIndex > 0) {
      const change = candle.close - candles[sourceIndex - 1].close;
      averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
      averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    }

    const rsi = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

    return {
      time: candle.time,
      value: rsi,
    };
  });
};

const calculateMacd = (candles: ChartCandle[]) => {
  const ema12 = calculateEma(candles, 12);
  const ema26 = calculateEma(candles, 26);
  const ema12ByTime = new Map(ema12.map((point) => [point.time, point.value]));
  const macdLine = ema26
    .map((point) => {
      const fast = ema12ByTime.get(point.time);
      return fast === undefined
        ? null
        : {
            time: point.time,
            value: fast - point.value,
          };
    })
    .filter((point): point is LineData<Time> => point !== null);

  if (macdLine.length < 9) {
    return { macdLine, signalLine: [], histogram: [] };
  }

  const multiplier = 2 / (9 + 1);
  let signal =
    macdLine.slice(0, 9).reduce((sum, point) => sum + point.value, 0) / 9;

  const signalLine = macdLine.slice(8).map((point, index) => {
    if (index > 0) {
      signal = (point.value - signal) * multiplier + signal;
    }

    return {
      time: point.time,
      value: signal,
    };
  });

  const signalByTime = new Map(signalLine.map((point) => [point.time, point.value]));
  const histogram = macdLine.reduce<HistogramData<Time>[]>((points, point) => {
    const value = signalByTime.get(point.time);
    if (value === undefined) {
      return points;
    }

    const histogramValue = point.value - value;
    points.push({
      time: point.time,
      value: histogramValue,
      color:
        histogramValue >= 0
          ? "rgba(207, 204, 209, 0.55)"
          : "rgba(248, 113, 113, 0.65)",
    });

    return points;
  }, []);

  return { macdLine, signalLine, histogram };
};

const normalizeSocketCandle = (payload: unknown): ChartCandle | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const rawTime = data.time ?? data.datetime ?? data.timestamp;
  const timestamp =
    typeof rawTime === "number"
      ? rawTime > 10_000_000_000
        ? Math.floor(rawTime / 1000)
        : rawTime
      : typeof rawTime === "string"
        ? Math.floor(new Date(rawTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

  const close = Number(data.close ?? data.price);
  const open = Number(data.open ?? close);
  const high = Number(data.high ?? Math.max(open, close));
  const low = Number(data.low ?? Math.min(open, close));

  if (![open, high, low, close, timestamp].every(Number.isFinite)) {
    return null;
  }

  return {
    time: timestamp as UTCTimestamp,
    label: new Date(timestamp * 1000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    open,
    high,
    low,
    close,
  };
};

export default function MainChartEngine({
  candles,
  selectedPair,
  selectedInterval,
  chartType,
  activeIndicators,
  loading,
  onLiveCandle,
  executionPlan,
}: MainChartEngineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<AnySeries | null>(null);
  const candlesRef = useRef<ChartCandle[]>(candles);
  const [crosshair, setCrosshair] = useState<CrosshairSnapshot | null>(null);
  const [streamStatus, setStreamStatus] = useState("Socket idle");

  const mainCandles = useMemo(
    () =>
      chartType === "Heikin Ashi"
        ? toHeikinAshi(candles)
        : candles.map((candle) => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          })),
    [candles, chartType],
  );

  const executionOverlay = useMemo(() => {
    if (!executionPlan || candles.length === 0) {
      return null;
    }

    const visibleCandles = candles.slice(-120);
    const values = [
      ...visibleCandles.flatMap((candle) => [candle.high, candle.low]),
      executionPlan.entry,
      executionPlan.stopLoss,
      executionPlan.takeProfit,
    ];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const padding = Math.max((high - low) * 0.18, 0.0008);
    const max = high + padding;
    const min = low - padding;
    const span = max - min || 1;
    const toTop = (price: number) => `${((max - price) / span) * 100}%`;

    return {
      direction: executionPlan.direction,
      orderType: executionPlan.orderType ?? "Market",
      isBuy: executionPlan.direction === "Buy",
      entryTop: toTop(executionPlan.entry),
      stopTop: toTop(executionPlan.stopLoss),
      targetTop: toTop(executionPlan.takeProfit),
    };
  }, [candles, executionPlan]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 620,
      layout: {
        background: { type: ColorType.Solid, color: "#08111d" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.62)" },
        horzLines: { color: "rgba(30, 41, 59, 0.62)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(148, 163, 184, 0.7)", labelBackgroundColor: "#0f172a" },
        horzLine: { color: "rgba(148, 163, 184, 0.7)", labelBackgroundColor: "#0f172a" },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: false,
      },
      trackingMode: {
        exitMode: 1,
      },
    });

    chartRef.current = chart;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const timestamp =
        typeof param.time === "number" ? param.time : Number(param.time);
      const data = candlesRef.current.find((candle) => candle.time === timestamp);

      if (!param.time || !data) {
        setCrosshair(null);
        return;
      }

      setCrosshair({
        time: new Date(timestamp * 1000).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const seriesToRemove: AnySeries[] = [];
    if (mainSeriesRef.current) {
      seriesToRemove.push(mainSeriesRef.current);
    }

    const addOverlay = (data: LineData<Time>[], color: string, title: string) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        title,
      });
      series.setData(data);
      seriesToRemove.push(series);
    };

    if (chartType === "Line") {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#2563eb",
        lineWidth: 2,
        priceLineColor: "#14b8a6",
      });
      lineSeries.setData(toLineData(candles));
      mainSeriesRef.current = lineSeries;
    } else if (chartType === "Area") {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#2563eb",
        topColor: "rgba(37, 99, 235, 0.24)",
        bottomColor: "rgba(20, 184, 166, 0.03)",
        lineWidth: 2,
        priceLineColor: "#14b8a6",
      });
      areaSeries.setData(toLineData(candles));
      mainSeriesRef.current = areaSeries;
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#34d399",
        wickDownColor: "#f87171",
        priceLineColor: "#14b8a6",
      });
      candleSeries.setData(mainCandles);
      mainSeriesRef.current = candleSeries;
    }

    if (executionPlan && mainSeriesRef.current) {
      mainSeriesRef.current.createPriceLine({
        price: executionPlan.takeProfit,
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP",
      });
      mainSeriesRef.current.createPriceLine({
        price: executionPlan.entry,
        color: "#60a5fa",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "ENTRY",
      });
      mainSeriesRef.current.createPriceLine({
        price: executionPlan.stopLoss,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (activeIndicators.includes("EMA 20") || activeIndicators.includes("EMA")) {
      addOverlay(calculateEma(candles, 20), "#60a5fa", "EMA 20");
    }

    if (activeIndicators.includes("EMA 50")) {
      addOverlay(calculateEma(candles, 50), "#f59e0b", "EMA 50");
    }

    if (activeIndicators.includes("EMA 200")) {
      addOverlay(calculateEma(candles, 200), "#8b5cf6", "EMA 200");
    }

    if (activeIndicators.includes("VWAP")) {
      addOverlay(calculateVwap(candles), "#a78bfa", "VWAP");
    }

    if (activeIndicators.includes("Volume")) {
      const volumeSeries = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
          priceLineVisible: false,
          lastValueVisible: false,
        },
        0,
      );
      chart.priceScale("volume").applyOptions({
        scaleMargins: {
          top: 0.78,
          bottom: 0,
        },
      });
      volumeSeries.setData(toVolumeData(candles));
      seriesToRemove.push(volumeSeries);
    }

    if (activeIndicators.includes("RSI")) {
      const rsiSeries = chart.addSeries(
        LineSeries,
        {
          color: "#a855f7",
          lineWidth: 2,
          priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          title: "RSI 14",
        },
        1,
      );
      rsiSeries.setData(calculateRsi(candles));
      seriesToRemove.push(rsiSeries);
    }

    if (activeIndicators.includes("MACD")) {
      const { macdLine, signalLine, histogram } = calculateMacd(candles);
      const histogramSeries = chart.addSeries(
        HistogramSeries,
        {
          priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
          title: "MACD Histogram",
        },
        activeIndicators.includes("RSI") ? 2 : 1,
      );
      histogramSeries.setData(histogram);
      seriesToRemove.push(histogramSeries);

      const macdSeries = chart.addSeries(
        LineSeries,
        { color: "#2563eb", lineWidth: 2, title: "MACD" },
        activeIndicators.includes("RSI") ? 2 : 1,
      );
      macdSeries.setData(macdLine);
      seriesToRemove.push(macdSeries);

      const signalSeries = chart.addSeries(
        LineSeries,
        { color: "#f97316", lineWidth: 1, title: "Signal" },
        activeIndicators.includes("RSI") ? 2 : 1,
      );
      signalSeries.setData(signalLine);
      seriesToRemove.push(signalSeries);
    }

    chart.timeScale().fitContent();

    return () => {
      for (const series of seriesToRemove) {
        try {
          chart.removeSeries(series);
        } catch {
          // Series can already be gone when the chart is torn down.
        }
      }
    };
  }, [activeIndicators, candles, chartType, executionPlan, mainCandles]);

  useEffect(() => {
    let socket: Socket | null = null;

    try {
      socket = io(socketUrl || undefined, {
        path: socketPath,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        timeout: 8000,
        query: {
          symbol: selectedPair,
          interval: selectedInterval,
        },
      });

      socket.on("connect", () => {
        setStreamStatus("Socket live");
        socket?.emit("subscribe", {
          symbol: selectedPair,
          interval: selectedInterval,
        });
      });

      socket.on("disconnect", () => {
        setStreamStatus("Socket disconnected");
      });

      socket.on("connect_error", () => {
        setStreamStatus("Socket unavailable");
      });

      const handleCandle = (payload: unknown) => {
        const nextCandle = normalizeSocketCandle(payload);
        if (!nextCandle) {
          return;
        }

        onLiveCandle(nextCandle);
      };

      socket.on("candle", handleCandle);
      socket.on("market:candle", handleCandle);
      socket.on("price:update", handleCandle);
      socket.on("tick", handleCandle);
    } catch {
      window.setTimeout(() => setStreamStatus("Socket unavailable"), 0);
    }

    return () => {
      socket?.emit("unsubscribe", {
        symbol: selectedPair,
        interval: selectedInterval,
      });
      socket?.disconnect();
    };
  }, [onLiveCandle, selectedInterval, selectedPair]);

  const latest = candles[candles.length - 1];
  const levels = supportResistance(candles);
  const snapshot =
    crosshair ??
    (latest
      ? {
          time: latest.label,
          open: latest.open,
          high: latest.high,
          low: latest.low,
          close: latest.close,
        }
      : null);

  return (
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden bg-[#08111d]">
      <div className="relative min-h-[420px] flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {executionOverlay && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-14 z-[5]">
            <div
              className="absolute left-0 right-0 bg-emerald-500/12"
              style={{
                top: executionOverlay.isBuy ? executionOverlay.targetTop : executionOverlay.entryTop,
                bottom: executionOverlay.isBuy ? `calc(100% - ${executionOverlay.entryTop})` : `calc(100% - ${executionOverlay.targetTop})`,
              }}
            />
            <div
              className="absolute left-0 right-0 bg-red-500/12"
              style={{
                top: executionOverlay.isBuy ? executionOverlay.entryTop : executionOverlay.stopTop,
                bottom: executionOverlay.isBuy ? `calc(100% - ${executionOverlay.stopTop})` : `calc(100% - ${executionOverlay.entryTop})`,
              }}
            />
            <PlanMarker label="TP" priceLabel="Take Profit" top={executionOverlay.targetTop} tone="profit" />
            <PlanMarker label={executionOverlay.orderType === "Market" ? "ENTRY" : executionOverlay.orderType} priceLabel={`${executionOverlay.direction} ${executionOverlay.orderType}`} top={executionOverlay.entryTop} tone="entry" />
            <PlanMarker label="SL" priceLabel="Stop Loss" top={executionOverlay.stopTop} tone="risk" />
          </div>
        )}
        {snapshot && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-[#08111d]/70 px-2 py-1 text-xs backdrop-blur">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-semibold text-white">Euro / U.S. Dollar · {selectedInterval} · FXCM</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  streamStatus === "Socket live" ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
              <span className="text-slate-500">{streamStatus}</span>
            </div>
            <div className="flex flex-wrap gap-3 font-mono">
              <span className="text-slate-300">O <b className="font-medium text-emerald-400">{formatPrice(snapshot.open)}</b></span>
              <span className="text-slate-300">H <b className="font-medium text-emerald-400">{formatPrice(snapshot.high)}</b></span>
              <span className="text-slate-300">L <b className="font-medium text-emerald-400">{formatPrice(snapshot.low)}</b></span>
              <span className="text-slate-300">C <b className="font-medium text-emerald-400">{formatPrice(snapshot.close)}</b></span>
            </div>
            <div className="mt-3 space-y-1 font-mono">
              {activeIndicators.includes("EMA 20") && <p className="text-slate-300">EMA 20 close <span className="text-blue-400">1.08541</span></p>}
              {activeIndicators.includes("EMA 50") && <p className="text-slate-300">EMA 50 close <span className="text-amber-400">1.08322</span></p>}
              {activeIndicators.includes("EMA 200") && <p className="text-slate-300">EMA 200 close <span className="text-violet-400">1.07918</span></p>}
            </div>
          </div>
        )}
        {levels && (
          <div className="pointer-events-none absolute right-14 top-[15%] z-10 grid gap-[132px] text-right text-xs font-medium">
            <span className="text-emerald-400">Resistance {formatPrice(levels.resistance)}</span>
            <span className="text-blue-400">Support {formatPrice(levels.support)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-[154px] left-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-[#121826] text-sm font-black text-white shadow-lg">
          TV
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#08111d]/80 text-sm text-slate-400">
            Loading chart data...
          </div>
        )}
        {!loading && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#08111d] text-sm text-slate-400">
            No chart data available
          </div>
        )}
      </div>
      <div className="flex h-36 shrink-0 flex-col border-t border-slate-800 bg-[#08111d]">
        <div className="flex h-8 items-center justify-between border-b border-slate-800 px-3 text-xs">
          <div className="flex gap-4 text-slate-300">
            {["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "All"].map((range) => (
              <button key={range} type="button" className="hover:text-white">
                {range}
              </button>
            ))}
          </div>
          <div className="font-mono text-slate-300">13:36:15 (UTC+2) <span className="ml-4">%</span> <span className="ml-3">log</span> <span className="ml-3">auto</span></div>
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-2">
          <div className="border-b border-slate-800 px-3 py-2 text-xs">
            <span className="text-slate-300">RSI 14 close</span>
            <span className="ml-3 font-mono text-violet-400">68.21</span>
          </div>
          <div className="px-3 py-2 text-xs">
            <span className="text-slate-300">MACD 12 26 close 9</span>
            <span className="ml-3 font-mono text-emerald-400">0.00064</span>
            <span className="ml-3 font-mono text-blue-400">0.00123</span>
            <span className="ml-3 font-mono text-orange-400">0.00059</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanMarker({
  label,
  priceLabel,
  top,
  tone,
}: {
  label: string;
  priceLabel: string;
  top: string;
  tone: "profit" | "risk" | "entry";
}) {
  const toneClasses = {
    profit: "border-emerald-400/70 bg-emerald-500/15 text-emerald-300",
    risk: "border-red-400/70 bg-red-500/15 text-red-300",
    entry: "border-blue-400/70 bg-blue-500/15 text-blue-300",
  };

  return (
    <div className="absolute left-5 right-0 flex items-center gap-3" style={{ top }}>
      <div className={`rounded border px-2 py-1 text-[11px] font-bold ${toneClasses[tone]}`}>
        {label}
      </div>
      <div className="h-px flex-1 border-t border-dashed border-current opacity-70" />
      <div className={`mr-2 rounded border px-2 py-1 text-[11px] font-medium ${toneClasses[tone]}`}>
        {priceLabel}
      </div>
    </div>
  );
}
