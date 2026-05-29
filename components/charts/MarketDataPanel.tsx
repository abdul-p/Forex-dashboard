import { Settings } from "lucide-react";

export interface MarketDataPanelProps {
  pair: string;
  price: string | null;
  changePercent: string;
  changeValue: string;
  isPositive: boolean;
  high: string;
  low: string;
}

export default function MarketDataPanel({
  pair,
  price,
  changePercent,
  changeValue,
  isPositive,
  high,
  low,
}: MarketDataPanelProps) {
  const tone = isPositive ? "text-emerald-400" : "text-red-400";

  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <div className="flex h-9 items-center justify-between border-b border-slate-800 px-3">
        <h3 className="text-sm font-semibold text-white">Market Data</h3>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-lg leading-none">+</span>
          <span className="text-lg leading-none">×</span>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <h4 className="text-lg font-semibold text-white">{pair}</h4>
            </div>
            <p className="text-xs text-slate-400">Euro / U.S. Dollar · FXCM</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Forex Major: Europe</p>
          </div>
          <Settings className="h-4 w-4 text-slate-400" />
        </div>

        <div className="mb-4">
          <div className="flex items-end gap-2">
            <span className={`font-mono text-3xl font-bold leading-none ${tone}`}>{price || "---.-----"}</span>
            <span className={`pb-1 font-mono text-sm ${tone}`}>
              {isPositive ? "+" : ""}
              {changeValue} ({isPositive ? "+" : ""}
              {changePercent}%)
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Market Open
          </div>
        </div>

        <div className="mb-4 space-y-3 text-xs">
          <div>
            <div className="mb-1 flex justify-between font-mono text-slate-200">
              <span>{low || "1.08231"}</span>
              <span>{high || "1.08865"}</span>
            </div>
            <div className="relative h-1.5 rounded bg-slate-800">
              <span className="absolute left-[35%] right-[22%] h-full rounded bg-emerald-500" />
              <span className="absolute left-[70%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" />
            </div>
            <p className="mt-1 text-center text-[10px] font-semibold text-slate-500">DAY RANGE</p>
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-slate-200">
              <span>1.04481</span>
              <span>1.12758</span>
            </div>
            <div className="relative h-1.5 rounded bg-slate-800">
              <span className="absolute left-[42%] right-[34%] h-full rounded bg-emerald-500/70" />
              <span className="absolute left-[62%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white" />
            </div>
            <p className="mt-1 text-center text-[10px] font-semibold text-slate-500">52W RANGE</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-7 gap-y-2 text-xs">
          <Metric label="Open" value="1.08240" />
          <Metric label="Prev Close" value="1.08240" />
          <Metric label="High" value={high || "1.08865"} tone="text-emerald-400" />
          <Metric label="Low" value={low || "1.08231"} />
          <Metric label="Spread" value="0.1" />
          <Metric label="Volume" value="124.58K" />
          <Metric label="ATR (14)" value="0.00182" />
          <Metric label="Volatility" value="0.62%" />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, tone = "text-slate-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className={`font-mono ${tone}`}>{value}</span>
    </div>
  );
}
