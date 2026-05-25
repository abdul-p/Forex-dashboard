export interface MarketDataPanelProps {
  pair: string;
  price: string | null;
  changePercent: string;
  isPositive: boolean;
  high: string;
  low: string;
}

export default function MarketDataPanel({
  pair,
  price,
  changePercent,
  isPositive,
  high,
  low,
}: MarketDataPanelProps) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Market Data
      </h3>
      
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-400">{pair}</div>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-2xl font-bold text-white font-mono leading-none">
            {price || "---.-----"}
          </span>
          <span
            className={`text-sm font-medium ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePercent}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-500 mb-1">Daily High</div>
          <div className="font-mono text-gray-200">{high || "---"}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Daily Low</div>
          <div className="font-mono text-gray-200">{low || "---"}</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Spread</div>
          <div className="font-mono text-gray-200">1.2 pips</div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Volume</div>
          <div className="font-mono text-gray-200">24.5K</div>
        </div>
        <div className="col-span-2 mt-1 pt-3 border-t border-gray-800/50">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Volatility (ATR)</span>
            <span className="font-mono text-gray-200">0.0018</span>
          </div>
        </div>
      </div>
    </div>
  );
}
