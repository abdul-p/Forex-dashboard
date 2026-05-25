import { Activity, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function TechnicalAnalysisPanel() {
  const trend = "Bullish";

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Technical Analysis
        </h3>
        <Activity className="h-4 w-4 text-gray-500" />
      </div>

      <div className="mb-5 flex items-center justify-between rounded-md bg-gray-900/50 p-2">
        <span className="text-xs text-gray-400">Overall Trend</span>
        <div className="flex items-center gap-1.5">
          {trend === "Bullish" ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          ) : trend === "Bearish" ? (
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          ) : (
            <Minus className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-semibold text-emerald-400">
            {trend}
          </span>
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <h4 className="text-[10px] font-semibold uppercase text-gray-500">
          Indicator Readings
        </h4>
        <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs">
          <span className="text-gray-400">RSI (14)</span>
          <span className="text-right font-medium text-emerald-400">68</span>

          <span className="text-gray-400">MACD</span>
          <span className="text-right font-medium text-emerald-400">Bullish Cross</span>

          <span className="text-gray-400">EMA Trend</span>
          <span className="text-right font-medium text-emerald-400">Uptrend</span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-[10px] font-semibold uppercase text-gray-500">
          Key Levels
        </h4>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Resistance 2</span>
            <span className="font-mono text-gray-200">1.0945</span>
          </div>
          <div className="flex justify-between items-center text-xs border-b border-gray-800/50 pb-1.5">
            <span className="text-gray-400">Resistance 1</span>
            <span className="font-mono text-emerald-400/80">1.0900</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-1.5">
            <span className="text-gray-400">Support 1</span>
            <span className="font-mono text-red-400/80">1.0820</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Support 2</span>
            <span className="font-mono text-gray-200">1.0785</span>
          </div>
        </div>
      </div>
    </div>
  );
}
