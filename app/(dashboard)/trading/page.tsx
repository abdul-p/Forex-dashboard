"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenText,
  ChevronDown,
  CircleDot,
  Clock3,
  Gauge,
  LineChart,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import MainChartEngine, { type ChartCandle, type ExecutionPlan } from "@/components/MainChartEngine";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP"];
const ORDER_TYPES = ["Market", "Limit", "Stop"] as const;
const POSITION_TABS = ["Open Positions", "Pending Orders", "Trade History"] as const;

interface Candle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
}

const toTimestamp = (datetime: string) => Math.floor(new Date(datetime).getTime() / 1000) as ChartCandle["time"];

const formatTime = (datetime: string) =>
  new Date(datetime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const numberOrFallback = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("Market");
  const [direction, setDirection] = useState<"Buy" | "Sell">("Buy");
  const [activeTab, setActiveTab] = useState<(typeof POSITION_TABS)[number]>("Open Positions");
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(true);

  const [accountBalance, setAccountBalance] = useState("25000");
  const [riskPercent, setRiskPercent] = useState("2");
  const [stopLossPips, setStopLossPips] = useState("52");
  const [rewardPips, setRewardPips] = useState("156");
  const [lotSize, setLotSize] = useState("0.12");
  const [entryPrice, setEntryPrice] = useState("1.08724");
  const [stopLoss, setStopLoss] = useState("1.08200");
  const [takeProfit, setTakeProfit] = useState("1.09500");

  const filteredPairs = PAIRS.filter((pair) => pair.toLowerCase().includes(pairSearch.toLowerCase()));

  useEffect(() => {
    let active = true;

    const fetchChartData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/market/timeseries?symbol=${encodeURIComponent(selectedPair)}&interval=1h`);
        const data = await res.json();

        if (active && data.values) {
          const formatted: ChartCandle[] = data.values
            .slice()
            .reverse()
            .map((candle: Candle) => ({
              time: toTimestamp(candle.datetime),
              label: formatTime(candle.datetime),
              open: parseFloat(candle.open),
              high: parseFloat(candle.high),
              low: parseFloat(candle.low),
              close: parseFloat(candle.close),
            }));

          setChartData(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch trading chart data:", error);
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
  }, [selectedPair]);

  const latestPrice = chartData[chartData.length - 1]?.close ?? 1.08724;
  const buyPrice = latestPrice.toFixed(5);
  const sellPrice = (latestPrice - 0.00004).toFixed(5);

  const handleLiveCandle = useCallback((nextCandle: ChartCandle) => {
    setChartData((current) => {
      const existingIndex = current.findIndex((candle) => candle.time === nextCandle.time);

      return existingIndex >= 0
        ? current.map((candle, index) => (index === existingIndex ? nextCandle : candle))
        : [...current, nextCandle].sort((first, second) => first.time - second.time).slice(-500);
    });
  }, []);

  const calculator = useMemo(() => {
    const balance = numberOrFallback(accountBalance, 0);
    const risk = numberOrFallback(riskPercent, 0);
    const slPips = Math.max(numberOrFallback(stopLossPips, 1), 1);
    const rrPips = Math.max(numberOrFallback(rewardPips, slPips * 3), 1);
    const riskDollars = balance * (risk / 100);
    const lots = riskDollars / (slPips * 10);
    const reward = riskDollars * (rrPips / slPips);

    return {
      positionSize: lots.toFixed(2),
      potentialLoss: riskDollars.toFixed(0),
      potentialProfit: reward.toFixed(0),
      rr: (rrPips / slPips).toFixed(1),
    };
  }, [accountBalance, riskPercent, rewardPips, stopLossPips]);

  const executionPlan: ExecutionPlan = {
    direction,
    entry: numberOrFallback(entryPrice, latestPrice),
    stopLoss: numberOrFallback(stopLoss, latestPrice - 0.00524),
    takeProfit: numberOrFallback(takeProfit, latestPrice + 0.00776),
    orderType,
  };

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
    setPairSearch(pair);
    setPairDropdownOpen(false);
  };

  const refreshPlan = (nextDirection: "Buy" | "Sell", nextOrderType = orderType) => {
    const entry = nextOrderType === "Market" ? latestPrice : numberOrFallback(entryPrice, latestPrice);
    const sl = nextDirection === "Buy" ? entry - 0.00524 : entry + 0.00524;
    const tp = nextDirection === "Buy" ? entry + 0.00776 : entry - 0.00776;

    setDirection(nextDirection);
    setEntryPrice(entry.toFixed(5));
    setStopLoss(sl.toFixed(5));
    setTakeProfit(tp.toFixed(5));
  };

  const handleOrderTypeSelect = (nextOrderType: (typeof ORDER_TYPES)[number]) => {
    setOrderType(nextOrderType);
    refreshPlan(direction, nextOrderType);
  };

  return (
    <div className="flex h-screen min-h-[880px] flex-col overflow-hidden bg-[#060b12] text-slate-100">
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#07101b] px-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPairDropdownOpen((open) => !open)}
              className="flex h-11 min-w-40 items-center gap-2 rounded-md border border-slate-800 bg-[#0a1421] px-3 text-left"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span>
                <span className="block text-sm font-bold text-white">{selectedPair}</span>
                <span className="text-[11px] text-slate-400">Forex Major</span>
              </span>
              <ChevronDown className="ml-auto h-4 w-4 text-slate-500" />
            </button>
            {pairDropdownOpen && (
              <div className="absolute left-0 top-12 z-40 w-60 overflow-hidden rounded-md border border-slate-700 bg-[#09111d] shadow-2xl">
                <input
                  value={pairSearch}
                  onChange={(event) => setPairSearch(event.target.value)}
                  className="w-full border-b border-slate-800 bg-[#07101b] px-3 py-2 text-sm text-white outline-none"
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
          <HeaderStat label="Market" value="Open" tone="success" />
          <HeaderStat label="Price" value={buyPrice} />
          <HeaderStat label="Change" value="+0.45%" tone="success" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <HeaderStat label="Spread" value="0.8" />
          <HeaderStat label="ATR" value="0.0018" />
          <HeaderStat label="Volatility" value="High" tone="warning" />
          <HeaderStat label="Session" value="London / New York" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(520px,1fr)_340px]">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-800 bg-[#07101b] p-3">
          <PanelTitle icon={SlidersHorizontal} title="Order Entry" subtitle="Create and size execution orders" />

          <div className="mb-3 grid grid-cols-3 gap-1 rounded-md bg-[#0a1421] p-1">
            {ORDER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleOrderTypeSelect(type)}
                className={`h-9 rounded text-xs font-semibold transition ${
                  orderType === type ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TradeButton label="BUY" price={buyPrice} active={direction === "Buy"} tone="buy" onClick={() => refreshPlan("Buy")} />
            <TradeButton label="SELL" price={sellPrice} active={direction === "Sell"} tone="sell" onClick={() => refreshPlan("Sell")} />
          </div>

          <section className="mt-3 rounded-md border border-slate-800 bg-[#0a1421] p-3">
            <h3 className="mb-3 text-sm font-semibold text-white">{orderType} Order</h3>
            <div className="grid grid-cols-2 gap-3">
              {orderType !== "Market" && <Field label="Entry Price" value={entryPrice} onChange={setEntryPrice} />}
              <Field label="Lot Size" value={lotSize} onChange={setLotSize} />
              <Field label="Risk" value={riskPercent} onChange={setRiskPercent} suffix="%" />
              <Field label="Stop Loss" value={stopLoss} onChange={setStopLoss} />
              <Field label="Take Profit" value={takeProfit} onChange={setTakeProfit} />
            </div>
            <button type="button" className="mt-4 h-10 w-full rounded bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
              Place {direction} {orderType} Order
            </button>
          </section>

          <section className="mt-3 rounded-md border border-slate-800 bg-[#0a1421] p-3">
            <PanelTitle icon={Gauge} title="Position Size Calculator" subtitle="Risk based lot sizing" compact />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account Balance" value={accountBalance} onChange={setAccountBalance} prefix="$" />
              <Field label="Risk" value={riskPercent} onChange={setRiskPercent} suffix="%" />
              <Field label="Stop Loss Pips" value={stopLossPips} onChange={setStopLossPips} />
              <Field label="Reward Pips" value={rewardPips} onChange={setRewardPips} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Result label="Position Size" value={`${calculator.positionSize} Lots`} />
              <Result label="Potential Loss" value={`$${calculator.potentialLoss}`} tone="risk" />
              <Result label="Potential Profit" value={`$${calculator.potentialProfit}`} tone="profit" />
              <Result label="RR" value={`1:${calculator.rr}`} />
            </div>
          </section>
        </aside>

        <main className="grid min-h-0 grid-rows-[minmax(0,1fr)_270px] border-r border-slate-800">
          <div className="min-h-0">
            <MainChartEngine
              candles={chartData}
              selectedPair={selectedPair}
              selectedInterval="1h"
              chartType="Candlestick"
              activeIndicators={["EMA 20", "EMA 50", "Volume"]}
              loading={loading}
              onLiveCandle={handleLiveCandle}
              executionPlan={executionPlan}
            />
          </div>
          <section className="min-h-0 border-t border-slate-800 bg-[#07101b]">
            <div className="flex h-11 items-center justify-between border-b border-slate-800 px-3">
              <div className="flex gap-1">
                {POSITION_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-8 rounded px-3 text-xs font-semibold ${
                      activeTab === tab ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">Command center</span>
            </div>
            <PositionsTable activeTab={activeTab} />
          </section>
        </main>

        <aside className="min-h-0 overflow-y-auto bg-[#07101b] p-3">
          <PanelTitle icon={LineChart} title="Trade Intelligence" subtitle="Decision and risk context" />
          <InfoBlock title="Trade Summary" rows={[["Direction", direction], ["Entry", entryPrice], ["SL", stopLoss], ["TP", takeProfit]]} />
          <InfoBlock
            title="Risk Analysis"
            rows={[["Risk", `$${calculator.potentialLoss}`], ["Reward", `$${calculator.potentialProfit}`], ["RR", `1:${calculator.rr}`]]}
          />
          <InfoBlock title="Margin Analysis" rows={[["Required Margin", "$214"], ["Free Margin", "$24,000"], ["Margin Level", "Safe"]]} />

          <section className="mb-3 rounded-md border border-slate-800 bg-[#0a1421] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Signal Engine</h3>
              <span className="rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">Strong Buy</span>
            </div>
            <Signal label="Trend" value="Bullish" />
            <Signal label="RSI" value="Buy" />
            <Signal label="MACD" value="Buy" />
            <Signal label="EMA20" value="Above EMA50" />
          </section>

          <Warning icon={AlertTriangle} title="Correlation Warning" text="You already have 3 USD-long positions." />
          <Warning icon={Clock3} title="High Impact News" text="USD CPI Release in 35 minutes." />
        </aside>
      </div>

      <footer className="grid h-[168px] shrink-0 grid-cols-3 gap-3 border-t border-slate-800 bg-[#07101b] p-3">
        <ExposurePanel />
        <JournalPanel />
        <RiskSummary />
      </footer>
    </div>
  );
}

function HeaderStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-emerald-400" : tone === "warning" ? "text-amber-300" : "text-white";

  return (
    <div className="min-w-28 rounded-md border border-slate-800 bg-[#0a1421] px-3 py-2">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  subtitle,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "mb-3" : "mb-4"}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600/15 text-blue-300">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </span>
    </div>
  );
}

function TradeButton({
  label,
  price,
  tone,
  active,
  onClick,
}: {
  label: string;
  price: string;
  tone: "buy" | "sell";
  active: boolean;
  onClick: () => void;
}) {
  const classes =
    tone === "buy"
      ? "bg-emerald-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.24)]"
      : "bg-red-500 text-white shadow-[0_10px_25px_rgba(239,68,68,0.22)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-20 rounded-md border px-3 text-left transition ${classes} ${
        active ? "border-white/70" : "border-transparent opacity-80 hover:opacity-100"
      }`}
    >
      <span className="block text-lg font-black">{label}</span>
      <span className="font-mono text-sm">{price}</span>
    </button>
  );
}

function Field({
  label,
  value,
  prefix,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <span className="flex h-9 overflow-hidden rounded border border-slate-700 bg-[#07101b]">
        {prefix && <span className="flex items-center border-r border-slate-700 px-2 text-xs text-slate-300">{prefix}</span>}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 font-mono text-xs text-white outline-none"
        />
        {suffix && <span className="flex items-center border-l border-slate-700 px-2 text-xs text-slate-300">{suffix}</span>}
        <button type="button" className="flex w-7 items-center justify-center border-l border-slate-700 text-slate-400" aria-label={`Decrease ${label}`}>
          <Minus className="h-3 w-3" />
        </button>
        <button type="button" className="flex w-7 items-center justify-center border-l border-slate-700 text-slate-400" aria-label={`Increase ${label}`}>
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </label>
  );
}

function Result({ label, value, tone }: { label: string; value: string; tone?: "profit" | "risk" }) {
  const color = tone === "profit" ? "text-emerald-300" : tone === "risk" ? "text-red-300" : "text-white";

  return (
    <div className="rounded border border-slate-800 bg-[#07101b] p-2">
      <p className="text-slate-400">{label}</p>
      <p className={`mt-1 font-mono font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="mb-3 rounded-md border border-slate-800 bg-[#0a1421] p-3">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className="font-mono font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-800 py-2 text-xs first:border-t-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-emerald-300">{value}</span>
    </div>
  );
}

function Warning({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <section className="mb-3 rounded-md border border-amber-400/25 bg-amber-500/10 p-3">
      <div className="flex gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <span>
          <h3 className="text-sm font-semibold text-amber-200">{title}</h3>
          <p className="mt-1 text-xs text-amber-100/80">{text}</p>
        </span>
      </div>
    </section>
  );
}

function PositionsTable({ activeTab }: { activeTab: (typeof POSITION_TABS)[number] }) {
  const rows =
    activeTab === "Open Positions"
      ? [
          ["EUR/USD", "Buy", "1.08200", "1.08724", "+$53", "Close  Modify  Partial Close"],
          ["GBP/USD", "Sell", "1.27140", "1.26890", "+$41", "Close  Modify  Partial Close"],
        ]
      : activeTab === "Pending Orders"
        ? [
            ["EUR/USD", "Buy Limit", "1.08000", "Awaiting", "-", "Cancel  Modify"],
            ["USD/JPY", "Sell Stop", "156.120", "Awaiting", "-", "Cancel  Modify"],
          ]
        : [
            ["GBP/USD", "Closed", "1.26410", "1.27120", "+$103", "Journal"],
            ["USD/JPY", "Closed", "155.800", "156.240", "-$45", "Review"],
          ];

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="text-slate-500">
          <tr className="border-b border-slate-800">
            {["Pair", "Type", "Entry", "Current", "P/L", "Actions"].map((heading) => (
              <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {rows.map((row) => (
            <tr key={`${row[0]}-${row[1]}`} className="border-b border-slate-800/70">
              {row.map((cell, index) => (
                <td key={cell} className={`px-3 py-3 ${index === 4 ? (cell.startsWith("+") ? "font-mono font-semibold text-emerald-300" : "font-mono font-semibold text-red-300") : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExposurePanel() {
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] p-3">
      <PanelTitle icon={WalletCards} title="Exposure" subtitle="Currency concentration" compact />
      <Exposure label="USD Exposure" value={42} />
      <Exposure label="EUR Exposure" value={18} />
      <Exposure label="JPY Exposure" value={12} />
    </section>
  );
}

function Exposure({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-white">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-slate-800">
        <div className="h-full rounded bg-blue-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function JournalPanel() {
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] p-3">
      <PanelTitle icon={BookOpenText} title="Trade Journal" subtitle="Post trade review" compact />
      <div className="grid grid-cols-3 gap-2">
        {["Reason For Entry", "Emotion", "Lessons Learned"].map((label) => (
          <label key={label} className="block">
            <span className="mb-1 block text-xs text-slate-400">{label}</span>
            <textarea className="h-16 w-full resize-none rounded border border-slate-800 bg-[#07101b] p-2 text-xs text-white outline-none" />
          </label>
        ))}
      </div>
    </section>
  );
}

function RiskSummary() {
  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] p-3">
      <PanelTitle icon={ShieldCheck} title="Risk Summary" subtitle="Account guardrails" compact />
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Result label="Daily Risk Used" value="3.4%" />
        <Result label="Open Risk" value="$386" tone="risk" />
        <Result label="Margin Status" value="Safe" tone="profit" />
        <Result label="Checklist" value="5/6 Passed" />
      </div>
    </section>
  );
}
