const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];

export default function TechnicalAnalysisPanel() {
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] p-3 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <h3 className="mb-3 text-sm font-semibold text-white">Technical Analysis</h3>

      <div className="mb-4 grid grid-cols-6 gap-1">
        {TIMEFRAMES.map((timeframe) => (
          <button
            key={timeframe}
            type="button"
            className={`h-7 rounded text-xs ${
              timeframe === "1H" ? "bg-blue-600 text-white" : "bg-[#07101b] text-slate-300 hover:bg-slate-800"
            }`}
          >
            {timeframe}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[144px_1fr] gap-3 border-b border-slate-800 pb-4">
        <div className="relative h-28">
          <div className="absolute inset-x-3 bottom-0 h-20 rounded-t-full border-[7px] border-b-0 border-emerald-500" />
          <div className="absolute inset-x-0 bottom-0 text-center">
            <p className="text-2xl font-semibold text-emerald-400">BUY</p>
            <p className="mt-1 text-xs text-emerald-400">Strong Buy</p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-xs">
          <span className="text-slate-300">RSI (14)</span>
          <span className="font-mono text-slate-300">68.21</span>
          <span className="font-semibold text-emerald-400">Buy</span>
          <span className="text-slate-300">MACD</span>
          <span />
          <span className="font-semibold text-emerald-400">Buy</span>
          <span className="text-slate-300">EMA 20</span>
          <span />
          <span className="font-semibold text-emerald-400">Above</span>
          <span className="text-slate-300">EMA 50</span>
          <span />
          <span className="font-semibold text-emerald-400">Above</span>
          <span className="text-slate-300">EMA 200</span>
          <span />
          <span className="font-semibold text-emerald-400">Above</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 pt-3 text-xs">
        <div>
          <p className="mb-2 text-slate-300">Support</p>
          <Level label="S1" value="1.08200" tone="text-emerald-400" />
          <Level label="S2" value="1.07850" tone="text-emerald-400" />
          <Level label="S3" value="1.07420" tone="text-emerald-400" />
        </div>
        <div>
          <p className="mb-2 text-slate-300">Resistance</p>
          <Level label="R1" value="1.09000" tone="text-red-400" />
          <Level label="R2" value="1.09380" tone="text-red-400" />
          <Level label="R3" value="1.09760" tone="text-red-400" />
        </div>
      </div>
    </section>
  );
}

function Level({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="mb-1 flex justify-between rounded bg-[#07101b] px-2 py-1">
      <span className={tone}>{label}</span>
      <span className={`font-mono ${tone}`}>{value}</span>
    </div>
  );
}
