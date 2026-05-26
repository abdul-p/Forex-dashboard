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

interface MainChartEngineProps {
  candles: ChartCandle[];
  selectedPair: string;
  selectedInterval: string;
  chartType: string;
  activeIndicators: string[];
  loading: boolean;
  onLiveCandle: (candle: ChartCandle) => void;
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

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 560,
      layout: {
        background: { type: ColorType.Solid, color: "#050505" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.55)" },
        horzLines: { color: "rgba(31, 41, 55, 0.55)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(207, 204, 209, 0.65)", labelBackgroundColor: "#111827" },
        horzLine: { color: "rgba(207, 204, 209, 0.65)", labelBackgroundColor: "#111827" },
      },
      rightPriceScale: {
        borderColor: "#1f2937",
      },
      timeScale: {
        borderColor: "#1f2937",
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
        color: "#cfccd1",
        lineWidth: 2,
        priceLineColor: "#cfccd1",
      });
      lineSeries.setData(toLineData(candles));
      mainSeriesRef.current = lineSeries;
    } else if (chartType === "Area") {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#cfccd1",
        topColor: "rgba(207, 204, 209, 0.24)",
        bottomColor: "rgba(207, 204, 209, 0.02)",
        lineWidth: 2,
        priceLineColor: "#cfccd1",
      });
      areaSeries.setData(toLineData(candles));
      mainSeriesRef.current = areaSeries;
    } else {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#cfccd1",
        downColor: "#f87171",
        borderUpColor: "#cfccd1",
        borderDownColor: "#f87171",
        wickUpColor: "#cfccd1",
        wickDownColor: "#f87171",
      });
      candleSeries.setData(mainCandles);
      mainSeriesRef.current = candleSeries;
    }

    if (activeIndicators.includes("EMA 20") || activeIndicators.includes("EMA")) {
      addOverlay(calculateEma(candles, 20), "#60a5fa", "EMA 20");
    }

    if (activeIndicators.includes("EMA 50")) {
      addOverlay(calculateEma(candles, 50), "#fbbf24", "EMA 50");
    }

    if (activeIndicators.includes("VWAP")) {
      addOverlay(calculateVwap(candles), "#a78bfa", "VWAP");
    }

    if (activeIndicators.includes("RSI")) {
      const rsiSeries = chart.addSeries(
        LineSeries,
        {
          color: "#34d399",
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
        { color: "#cfccd1", lineWidth: 2, title: "MACD" },
        activeIndicators.includes("RSI") ? 2 : 1,
      );
      macdSeries.setData(macdLine);
      seriesToRemove.push(macdSeries);

      const signalSeries = chart.addSeries(
        LineSeries,
        { color: "#f87171", lineWidth: 1, title: "Signal" },
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
  }, [activeIndicators, candles, chartType, mainCandles]);

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
    <div className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-lg border border-gray-800 bg-gray-950/80 shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800/80 bg-gray-900/30 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{selectedPair}</h2>
            <span
              className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                streamStatus === "Socket live"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-gray-800 bg-gray-900 text-gray-500"
              }`}
            >
              {streamStatus}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {chartType} chart / {selectedInterval} / {activeIndicators.length} indicators
          </p>
        </div>

        {snapshot && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right text-xs sm:grid-cols-5">
            <div>
              <p className="text-gray-500">Time</p>
              <p className="font-mono text-gray-200">{snapshot.time}</p>
            </div>
            <div>
              <p className="text-gray-500">O</p>
              <p className="font-mono text-white">{formatPrice(snapshot.open)}</p>
            </div>
            <div>
              <p className="text-gray-500">H</p>
              <p className="font-mono text-white">{formatPrice(snapshot.high)}</p>
            </div>
            <div>
              <p className="text-gray-500">L</p>
              <p className="font-mono text-white">{formatPrice(snapshot.low)}</p>
            </div>
            <div>
              <p className="text-gray-500">C</p>
              <p className="font-mono text-white">{formatPrice(snapshot.close)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="relative min-h-[420px] flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 text-sm text-gray-500">
            Loading chart data...
          </div>
        )}
        {!loading && candles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-sm text-gray-500">
            No chart data available
          </div>
        )}
      </div>
    </div>
  );
}
