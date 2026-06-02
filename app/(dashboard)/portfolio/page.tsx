"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Brain,
  CheckCircle2,
  Clock3,
  Gauge,
  Landmark,
  LineChart as LineChartIcon,
  Medal,
  ShieldCheck,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TIME_FILTERS = ["1D", "1W", "1M", "3M", "6M", "1Y", "ALL"] as const;
const HISTORY_FILTERS = ["Today", "Week", "Month", "Custom"] as const;

interface PortfolioStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalProfit: number;
  floatingProfit: number;
  balance: number;
  equity: number;
  freeMargin: number;
  marginUsed: number;
  marginLevel: number;
  currentRisk: number;
  maxDrawdown: number;
  averageRiskPerTrade: number;
  largestLosingTrade: number;
  largestWinningTrade: number;
  winRate: number;
  lossRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  riskRewardRatio: number;
  healthScore: number;
}

interface EquityPoint {
  date: string;
  balance: number;
  equity: number;
  profit: number;
  event: string;
}

interface OpenPosition {
  id: string;
  pair: string;
  type: "buy" | "sell";
  entry: number;
  current: number;
  profit: number;
  lotSize: number;
  stopLoss: number;
  takeProfit: number;
  duration: string;
}

interface CurrencyExposure {
  currency: string;
  amount: number;
  percent: number;
  direction: "long" | "short";
}

interface PairStat {
  trades: number;
  profit: number;
}

interface TradeHistoryRow {
  id: string;
  pair: string;
  type: "buy" | "sell";
  result: number;
  date: string;
  strategy: string;
}

interface JournalEntry {
  id: string;
  pair: string;
  note: string;
  emotion: string;
  lesson: string;
}

interface Achievement {
  label: string;
  achieved: boolean;
  progress: number;
  target: number;
}

interface PortfolioData {
  stats: PortfolioStats;
  equityCurve: EquityPoint[];
  openPositions: OpenPosition[];
  exposure: {
    currencies: CurrencyExposure[];
    longPercent: number;
    shortPercent: number;
  };
  pairStats: Record<string, PairStat>;
  tradeHistory: TradeHistoryRow[];
  journalEntries: JournalEntry[];
  achievements: Achievement[];
  insights: string[];
}

const money = (value: number, options?: { signed?: boolean; compact?: boolean }) => {
  const prefix = options?.signed && value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value)}`;
};

const decimalMoney = (value: number, options?: { signed?: boolean }) => {
  const prefix = options?.signed && value > 0 ? "+" : "";

  return `${prefix}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
};

const percent = (value: number) => `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;

const profitClass = (value: number) => (value >= 0 ? "text-emerald-300" : "text-rose-300");

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<(typeof TIME_FILTERS)[number]>("1M");
  const [historyFilter, setHistoryFilter] = useState<(typeof HISTORY_FILTERS)[number]>("Month");

  useEffect(() => {
    let active = true;

    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/portfolio");
        const data = await response.json();

        if (active) {
          setPortfolio(data);
        }
      } catch (error) {
        console.error("Failed to fetch portfolio:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchPortfolio();

    return () => {
      active = false;
    };
  }, []);

  const pairChartData = useMemo(
    () =>
      Object.entries(portfolio?.pairStats || {}).map(([pair, data]) => ({
        pair,
        profit: Number(data.profit.toFixed(2)),
        trades: data.trades,
      })),
    [portfolio?.pairStats],
  );

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center text-sm text-[var(--text-muted)]">
        Loading portfolio management center...
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
        Portfolio data could not be loaded.
      </div>
    );
  }

  const { stats } = portfolio;

  return (
    <div className="space-y-6 pb-10 text-slate-100">
      <header className="rounded-lg border border-slate-800 bg-[#07101b] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
              <Landmark className="h-4 w-4" />
              Portfolio Management Center
            </div>
            <h1 className="text-2xl font-bold text-white">Capital, performance, and risk command center</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Track account health, open exposure, risk quality, trading statistics, journal behavior, and growth milestones.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HeaderPill label="Closed" value={stats.closedTrades.toString()} />
            <HeaderPill label="Open" value={stats.openTrades.toString()} />
            <HeaderPill label="Health" value={`${stats.healthScore}/100`} tone={stats.healthScore >= 75 ? "good" : "warn"} />
            <HeaderPill label="P/L" value={money(stats.totalProfit, { signed: true, compact: true })} tone={stats.totalProfit >= 0 ? "good" : "bad"} />
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={WalletCards} label="Balance" value={money(stats.balance)} detail="Money after closed trades" />
        <MetricCard icon={TrendingUp} label="Equity" value={money(stats.equity)} detail={`Floating P/L ${money(stats.floatingProfit, { signed: true })}`} tone={stats.equity >= stats.balance ? "good" : "bad"} />
        <MetricCard icon={Activity} label="Free Margin" value={money(stats.freeMargin)} detail={`${money(stats.marginUsed)} margin used`} tone={stats.freeMargin >= 0 ? "good" : "bad"} />
        <MetricCard icon={Gauge} label="Margin Level" value={stats.marginUsed > 0 ? percent(stats.marginLevel) : "No margin"} detail="Equity divided by used margin" tone={stats.marginLevel >= 200 || stats.marginUsed === 0 ? "good" : "warn"} />
      </section>

      <section className="rounded-lg border border-slate-800 bg-[#07101b] p-5">
        <SectionHeader icon={LineChartIcon} title="Equity & Balance Performance" subtitle="Growth curve with balance and equity over time">
          <SegmentedControl values={TIME_FILTERS} active={timeFilter} onChange={setTimeFilter} />
        </SectionHeader>
        <div className="mt-5 h-[320px]">
          {portfolio.equityCurve.length <= 1 ? (
            <EmptyState title="No closed trades yet" detail="Close trades to build an account performance curve." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolio.equityCurve}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => money(Number(value), { compact: true })} width={72} />
                <Tooltip content={<PortfolioTooltip />} />
                <Line type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#22d3ee" }} />
                <Line type="monotone" dataKey="balance" stroke="#a78bfa" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#a78bfa" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Panel icon={BarChart3} title="Open Positions" subtitle="Current trades with live risk placeholders from internal trade data">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="pb-3 font-semibold">Pair</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Entry</th>
                  <th className="pb-3 font-semibold">Current</th>
                  <th className="pb-3 font-semibold">SL / TP</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 text-right font-semibold">P/L</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.openPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState title="No open positions" detail="Open trades will appear here with risk and exposure context." compact />
                    </td>
                  </tr>
                ) : (
                  portfolio.openPositions.map((position) => (
                    <tr key={position.id} className="border-b border-slate-800/70 last:border-0">
                      <td className="py-3 font-semibold text-white">{position.pair}</td>
                      <td className="py-3">
                        <span className={`rounded px-2 py-1 text-xs font-bold ${position.type === "buy" ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                          {position.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{position.entry.toFixed(5)}</td>
                      <td className="py-3 text-slate-300">{position.current.toFixed(5)}</td>
                      <td className="py-3 text-slate-400">{position.stopLoss.toFixed(5)} / {position.takeProfit.toFixed(5)}</td>
                      <td className="py-3 text-slate-400">{position.duration}</td>
                      <td className={`py-3 text-right font-bold ${profitClass(position.profit)}`}>{decimalMoney(position.profit, { signed: true })}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <ActionButton label="Modify" />
                          <ActionButton label="Close" tone="danger" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel icon={Activity} title="Exposure Analysis" subtitle="Currency concentration and direction split">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <ExposureSplit label="Long Positions" value={portfolio.exposure.longPercent} tone="long" />
              <ExposureSplit label="Short Positions" value={portfolio.exposure.shortPercent} tone="short" />
            </div>
            <div className="space-y-3">
              {portfolio.exposure.currencies.length === 0 ? (
                <EmptyState title="No exposure" detail="Currency exposure is calculated from open positions." compact />
              ) : (
                portfolio.exposure.currencies.map((item) => (
                  <div key={item.currency}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{item.currency}</span>
                      <span className={item.direction === "long" ? "text-emerald-300" : "text-rose-300"}>
                        {percent(item.percent)} {item.direction}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-800">
                      <div className={`h-full rounded ${item.direction === "long" ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel icon={ShieldCheck} title="Risk Management Dashboard" subtitle="Account risk, drawdown, and outlier trades">
          <div className="grid gap-3 sm:grid-cols-2">
            <RiskRow label="Current Risk" value={percent(stats.currentRisk)} tone={stats.currentRisk <= 3 ? "good" : "bad"} />
            <RiskRow label="Maximum Drawdown" value={percent(stats.maxDrawdown)} tone={stats.maxDrawdown > -10 ? "good" : "bad"} />
            <RiskRow label="Average Risk / Trade" value={percent(stats.averageRiskPerTrade)} tone={stats.averageRiskPerTrade <= 2 ? "good" : "warn"} />
            <RiskRow label="Largest Losing Trade" value={decimalMoney(stats.largestLosingTrade)} tone="bad" />
            <RiskRow label="Largest Winning Trade" value={decimalMoney(stats.largestWinningTrade, { signed: true })} tone="good" />
            <RiskRow label="Margin Used" value={money(stats.marginUsed)} tone={stats.marginUsed > 0 ? "warn" : "good"} />
          </div>
        </Panel>

        <Panel icon={BarChart3} title="Trading Statistics" subtitle="Quality metrics for evaluating trader behavior">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Win Rate" value={percent(stats.winRate)} tone={stats.winRate >= 50 ? "good" : "bad"} />
              <StatTile label="Loss Rate" value={percent(stats.lossRate)} tone={stats.lossRate <= 40 ? "good" : "warn"} />
              <StatTile label="Profit Factor" value={stats.profitFactor === 999 ? "∞" : stats.profitFactor.toFixed(2)} tone={stats.profitFactor >= 1.5 ? "good" : "warn"} />
              <StatTile label="RR Ratio" value={`1:${stats.riskRewardRatio.toFixed(1)}`} tone={stats.riskRewardRatio >= 1.5 ? "good" : "warn"} />
              <StatTile label="Average Win" value={decimalMoney(stats.avgWin, { signed: true })} tone="good" />
              <StatTile label="Average Loss" value={decimalMoney(-stats.avgLoss)} tone="bad" />
            </div>
            <div className="h-[220px]">
              {pairChartData.length === 0 ? (
                <EmptyState title="No pair data" detail="Closed trades are needed for pair performance." compact />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pairChartData}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="pair" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => money(Number(value), { compact: true })} />
                    <Tooltip content={<PairTooltip />} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {pairChartData.map((entry) => (
                        <Cell key={entry.pair} fill={entry.profit >= 0 ? "#34d399" : "#fb7185"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Panel>
      </section>

      <Panel icon={Clock3} title="Trade History" subtitle="Recent closed trade activity with quick filters">
        <div className="mb-4">
          <SegmentedControl values={HISTORY_FILTERS} active={historyFilter} onChange={setHistoryFilter} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Pair</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Strategy</th>
                <th className="pb-3 text-right font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No closed trade history" detail="Closed trades will appear here." compact />
                  </td>
                </tr>
              ) : (
                portfolio.tradeHistory.map((trade) => (
                  <tr key={trade.id} className="border-b border-slate-800/70 last:border-0">
                    <td className="py-3 text-slate-400">{trade.date}</td>
                    <td className="py-3 font-semibold text-white">{trade.pair}</td>
                    <td className="py-3 text-slate-300">{trade.type.toUpperCase()}</td>
                    <td className="py-3 text-slate-400">{trade.strategy}</td>
                    <td className={`py-3 text-right font-bold ${profitClass(trade.result)}`}>{decimalMoney(trade.result, { signed: true })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel icon={BookOpenText} title="Trading Journal" subtitle="Recent trade notes, emotions, and lessons">
          <div className="space-y-3">
            {portfolio.journalEntries.length === 0 ? (
              <EmptyState title="No journal notes" detail="Notes added in the trade journal will surface here." compact />
            ) : (
              portfolio.journalEntries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-800 bg-[#0a1421] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-white">{entry.pair}</span>
                    <span className="rounded bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-300">{entry.emotion}</span>
                  </div>
                  <p className="text-sm text-slate-300">{entry.note}</p>
                  <p className="mt-2 text-xs text-slate-500">{entry.lesson}</p>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel icon={Medal} title="Achievements & Milestones" subtitle="Progress markers for trader growth">
          <div className="space-y-4">
            {portfolio.achievements.map((achievement) => {
              const progress = Math.min((achievement.progress / achievement.target) * 100, 100);

              return (
                <div key={achievement.label}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-white">
                      {achievement.achieved ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Medal className="h-4 w-4 text-slate-500" />}
                      {achievement.label}
                    </span>
                    <span className="text-xs text-slate-500">{Math.round(achievement.progress)} / {achievement.target}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-slate-800">
                    <div className={achievement.achieved ? "h-full rounded bg-emerald-400" : "h-full rounded bg-cyan-400"} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel icon={Brain} title="AI Portfolio Intelligence" subtitle="Health score, warnings, and performance suggestions">
          <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Portfolio Health Score</p>
                <p className="mt-2 text-4xl font-bold text-white">{stats.healthScore}</p>
              </div>
              <span className="text-sm font-semibold text-cyan-200">/ 100</span>
            </div>
          </div>
          <div className="space-y-3">
            {portfolio.insights.map((insight) => (
              <div key={insight} className="flex gap-3 rounded-lg border border-slate-800 bg-[#0a1421] p-3 text-sm text-slate-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function HeaderPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const toneClass = {
    neutral: "text-slate-200",
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a1421] px-3 py-2">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = "neutral" }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const toneClass = {
    neutral: "text-white",
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#07101b] p-4">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded bg-slate-800 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Panel({ icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#07101b] p-5">
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, children }: { icon: LucideIcon; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-800 text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({ values, active, onChange }: { values: readonly T[]; active: T; onChange: (value: T) => void }) {
  return (
    <div className="flex w-fit rounded bg-[#0a1421] p-1">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`h-8 min-w-10 rounded px-3 text-xs font-semibold transition ${active === value ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#0a1421] text-center ${compact ? "min-h-32 p-4" : "h-full min-h-64 p-6"}`}>
      <p className="font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function ActionButton({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "danger" }) {
  return (
    <button
      type="button"
      className={`h-8 rounded px-3 text-xs font-semibold transition ${tone === "danger" ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"}`}
    >
      {label}
    </button>
  );
}

function ExposureSplit({ label, value, tone }: { label: string; value: number; tone: "long" | "short" }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a1421] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "long" ? "text-emerald-300" : "text-rose-300"}`}>{percent(value)}</p>
    </div>
  );
}

function RiskRow({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" }) {
  const toneClass = {
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a1421] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" }) {
  const toneClass = {
    good: "text-emerald-300",
    bad: "text-rose-300",
    warn: "text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a1421] p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PortfolioTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0a1421] p-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-white">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {money(Number(item.value))}
        </p>
      ))}
    </div>
  );
}

function PairTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  const value = Number(payload[0].value);

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0a1421] p-3 text-sm shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className={profitClass(value)}>{decimalMoney(value, { signed: true })}</p>
    </div>
  );
}
