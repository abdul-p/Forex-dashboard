"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  BarChart3,
  Brain,
  Building2,
  CalendarClock,
  ChevronDown,
  CircleDot,
  Gauge,
  GitCompareArrows,
  LineChart,
  Newspaper,
  Radar,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

const PAIRS = ["EUR/USD", "USD/JPY", "GBP/USD", "AUD/USD", "USD/CAD", "EUR/GBP"];

interface AnalysisPayload {
  symbol: string;
  generatedAt: string;
  sources: Record<string, string>;
  marketSummary: {
    label: string;
    value: string;
    detail: string;
    tone: string;
  }[];
  technical: {
    trend: string;
    strength: string;
    support: string;
    resistance: string;
    pattern: string;
    score: number;
    atrPips: number;
    indicators: { label: string; value: string }[];
  };
  fundamental: {
    events: {
      event: string;
      country: string;
      currency: string;
      date: string;
      impact: string;
      forecast: string;
      previous: string;
    }[];
    banks: { label: string; value: string }[];
    macroRows: { label: string; value: string }[];
  };
  sentiment: {
    retail: {
      available: boolean;
      long: number;
      short: number;
      detail: string;
    };
    news: {
      label: string;
      score: number;
      detail: string;
    };
    social: {
      label: string;
      detail: string;
    };
    headlines: {
      title: string;
      source: string;
      publishedAt: string;
    }[];
  };
  ai: {
    narrative: string;
    forecast: string;
    alert: string;
    topSetup?: Opportunity;
  };
  correlations: {
    pairRows: { label: string; value: number }[];
    matrix: { currency: string; values: (number | null)[] }[];
  };
  opportunities: Opportunity[];
}

interface Opportunity {
  pair: string;
  score: number;
  direction: "BUY" | "SELL" | "HOLD";
  risk: string;
  volatility: string;
  rr: string;
  confidence: string;
}

const EMPTY_TECHNICAL: AnalysisPayload["technical"] = {
  trend: "Unavailable",
  strength: "0/10",
  support: "Unavailable",
  resistance: "Unavailable",
  pattern: "Unavailable",
  score: 0,
  atrPips: 0,
  indicators: [],
};

const SUMMARY_ICONS: Record<string, LucideIcon> = {
  "Market Regime": TrendingUp,
  "Risk Sentiment": Gauge,
  "Strongest Currency": Zap,
  "Weakest Currency": ShieldAlert,
  "Most Active Session": CalendarClock,
};

const EMPTY_OPPORTUNITY: Opportunity = {
  pair: "Unavailable",
  score: 0,
  direction: "HOLD",
  risk: "Unavailable",
  volatility: "Unavailable",
  rr: "N/A",
  confidence: "0%",
};

export default function AnalysisPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState("USD/JPY");
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredPairs = PAIRS.filter((pair) => pair.toLowerCase().includes(pairSearch.toLowerCase()));
  const technical = analysis?.technical ?? EMPTY_TECHNICAL;
  const opportunities = useMemo(() => analysis?.opportunities ?? [], [analysis]);
  const opportunity = useMemo(
    () => opportunities.find((item) => item.pair === selectedOpportunity) ?? opportunities[0] ?? EMPTY_OPPORTUNITY,
    [opportunities, selectedOpportunity],
  );

  useEffect(() => {
    let active = true;

    const loadAnalysis = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/analysis?symbol=${encodeURIComponent(selectedPair)}`);
        const data = (await response.json()) as AnalysisPayload | { message?: string };
        if (!response.ok) {
          throw new Error("message" in data ? data.message : "Failed to load analysis");
        }
        if (active) {
          const payload = data as AnalysisPayload;
          setAnalysis(payload);
          setSelectedOpportunity(payload.opportunities[0]?.pair ?? selectedPair);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load analysis");
          setAnalysis(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      active = false;
    };
  }, [selectedPair]);

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
    setPairSearch(pair);
    setPairDropdownOpen(false);
  };

  return (
    <div className="space-y-6 text-slate-100">
      <header className="rounded-lg border border-slate-800 bg-[#07101b] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Brain className="h-4 w-4" />
              Analysis Center
            </div>
            <h1 className="text-2xl font-bold text-white">Deep Research & Decision Support</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Evaluate technicals, fundamentals, sentiment, correlations, and opportunity quality before moving to execution.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
              {analysis &&
                Object.entries(analysis.sources).map(([key, value]) => (
                  <span key={key} className="rounded border border-slate-800 bg-[#0a1421] px-2 py-1">
                    {key}: {value}
                  </span>
                ))}
              {loading && <span className="rounded border border-slate-800 bg-[#0a1421] px-2 py-1">Loading live analysis...</span>}
              {error && <span className="rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-red-300">{error}</span>}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <button
              type="button"
              onClick={() => setPairDropdownOpen((open) => !open)}
              className="flex h-11 w-full items-center gap-2 rounded-md border border-slate-800 bg-[#0a1421] px-3 text-left"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <span>
                <span className="block text-sm font-bold text-white">{selectedPair}</span>
                <span className="text-[11px] text-slate-400">Research focus</span>
              </span>
              <ChevronDown className="ml-auto h-4 w-4 text-slate-500" />
            </button>
            {pairDropdownOpen && (
              <div className="absolute right-0 top-12 z-30 w-full overflow-hidden rounded-md border border-slate-700 bg-[#09111d] shadow-2xl">
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
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {(analysis?.marketSummary ?? []).map((item) => (
          <SummaryCard key={item.label} {...item} icon={SUMMARY_ICONS[item.label] ?? Brain} />
        ))}
        {!analysis && [TrendingUp, Gauge, Zap, ShieldAlert, CalendarClock].map((Icon, index) => (
          <SummaryCard key={index} label="Loading" value="..." detail="Fetching live analysis" icon={Icon} tone="blue" />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ResearchCard icon={LineChart} title="Technical Analysis" subtitle={`${selectedPair} chart-reading intelligence`}>
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Metric label="Trend" value={technical.trend} tone="profit" />
            <Metric label="Strength" value={technical.strength} />
            <Metric label="Support" value={technical.support} />
            <Metric label="Resistance" value={technical.resistance} />
          </div>
          <div className="space-y-2">
            {technical.indicators.map(({ label, value }) => (
              <SignalRow key={label} label={label} value={value} />
            ))}
            <SignalRow label="Pattern" value={technical.pattern} accent />
            <SignalRow label="Technical Score" value={`${technical.score}/100`} accent />
          </div>
        </ResearchCard>

        <ResearchCard icon={Building2} title="Fundamental Analysis" subtitle="Macro drivers and central bank posture">
          <div className="mb-4 space-y-2">
            {(analysis?.fundamental.events ?? []).map((event) => (
              <div key={event.event} className="rounded-md border border-slate-800 bg-[#07101b] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{event.event}</p>
                    <p className="mt-1 text-xs text-slate-400">{event.date || event.currency} - {event.impact}</p>
                  </div>
                  <span className="rounded bg-red-500/15 px-2 py-1 text-[11px] font-bold text-red-300">{event.impact.split(" ")[0]}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <Metric label="Forecast" value={event.forecast} />
                  <Metric label="Previous" value={event.previous} />
                </div>
              </div>
            ))}
            {analysis?.fundamental.events.length === 0 && (
              <div className="rounded-md border border-slate-800 bg-[#07101b] p-3 text-sm text-slate-400">
                No pair-specific calendar events returned by the current feed.
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(analysis?.fundamental.banks ?? []).map(({ label, value }) => (
              <Metric key={label} label={label} value={value} />
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(analysis?.fundamental.macroRows ?? []).map(({ label, value }) => (
              <Metric key={label} label={label} value={value} />
            ))}
          </div>
        </ResearchCard>

        <ResearchCard icon={UsersRound} title="Sentiment Analysis" subtitle="Positioning, news, and crowd psychology">
          <div className="rounded-md border border-slate-800 bg-[#07101b] p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{selectedPair}</p>
                <p className="text-xs text-slate-400">Retail positioning</p>
              </div>
              <span className="rounded bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">Contrarian Watch</span>
            </div>
            {analysis?.sentiment.retail.available ? (
              <>
                <Progress label="Long" value={analysis.sentiment.retail.long} tone="green" />
                <Progress label="Short" value={analysis.sentiment.retail.short} tone="red" />
              </>
            ) : (
              <p className="text-sm text-slate-400">{analysis?.sentiment.retail.detail ?? "Loading positioning..."}</p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="News Sentiment" value={`${analysis?.sentiment.news.label ?? "Loading"} ${analysis?.sentiment.news.score ?? 0}/100`} tone={analysis?.sentiment.news.label === "Positive" ? "profit" : analysis?.sentiment.news.label === "Negative" ? "risk" : undefined} />
            <Metric label="News Sample" value={analysis?.sentiment.news.detail ?? "Loading"} />
            <Metric label="Social Sentiment" value={analysis?.sentiment.social.label ?? "Unavailable"} />
            <Metric label="Social Source" value={analysis?.sentiment.social.detail ?? "Connect social APIs"} />
          </div>
        </ResearchCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ResearchCard icon={Sparkles} title="AI Market Intelligence" subtitle="Narrative, forecast, and risk alerts">
          <div className="grid gap-3 lg:grid-cols-3">
            <NarrativeBlock
              icon={Newspaper}
              title="Market Narrative"
              text={analysis?.ai.narrative ?? "Loading live market narrative..."}
            />
            <NarrativeBlock
              icon={BadgePercent}
              title="Next 24H Bias"
              text={analysis?.ai.forecast ?? "Loading forecast..."}
            />
            <NarrativeBlock
              icon={AlertTriangle}
              title="AI Risk Alert"
              text={analysis?.ai.alert ?? "Loading risk alert..."}
              warning
            />
          </div>
        </ResearchCard>

        <ResearchCard icon={Radar} title="AI Opportunity Scanner" subtitle="Highest quality setup right now">
          <div className="rounded-md border border-emerald-400/25 bg-emerald-500/10 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-300">Top Setup</p>
                <h3 className="mt-1 text-2xl font-bold text-white">{analysis?.ai.topSetup?.pair ?? "Loading"}</h3>
              </div>
              <span className="rounded bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">{analysis?.ai.topSetup?.confidence ?? "0%"}</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Score {analysis?.ai.topSetup?.score ?? 0}/100 from technical, fundamental, and sentiment weighting.
            </p>
            <button type="button" className="mt-4 flex h-9 items-center gap-2 rounded bg-emerald-500 px-3 text-sm font-semibold text-white">
              Review Setup
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </ResearchCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ResearchCard icon={GitCompareArrows} title="Correlation & Intermarket Analysis" subtitle="Avoid duplicated risk across connected trades">
          <div className="grid gap-2 sm:grid-cols-2">
            {(analysis?.correlations.pairRows ?? []).map(({ label, value }) => (
              <Metric key={label} label={label} value={`${value > 0 ? "+" : ""}${value}%`} tone={value > 0 ? "profit" : "risk"} />
            ))}
            {!analysis && <Metric label="Correlation" value="Loading" />}
          </div>
          <div className="mt-4 rounded-md border border-amber-400/25 bg-amber-500/10 p-3">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <p className="text-sm text-amber-100">
                Correlation warning: compare same-direction exposure before stacking high-correlation setups.
              </p>
            </div>
          </div>
        </ResearchCard>

        <ResearchCard icon={BarChart3} title="Correlation Matrix" subtitle="Major currency relationship heatmap">
          <div className="overflow-auto">
            <table className="w-full min-w-[520px] text-center text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-3 py-2 text-left">Currency</th>
                  {["EUR", "USD", "GBP", "JPY"].map((currency) => (
                    <th key={currency} className="px-3 py-2 font-medium">{currency}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(analysis?.correlations.matrix ?? []).map((row) => (
                  <tr key={row.currency} className="border-t border-slate-800">
                    <td className="px-3 py-3 text-left font-semibold text-white">{row.currency}</td>
                    {row.values.map((cell, index) => (
                      <td key={`${row.currency}-${index}`} className={`px-3 py-3 ${matrixTone(cell)}`}>
                        {cell === null ? "-" : `${cell > 0 ? "+" : ""}${cell}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResearchCard>
      </section>

      <section className="rounded-lg border border-slate-800 bg-[#07101b] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TitleBlock icon={Target} title="Trade Opportunity Scanner" subtitle="Ranked setups based on technical, macro, sentiment, and risk conditions" />
          <span className="rounded bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-300">
            {analysis ? `Updated ${new Date(analysis.generatedAt).toLocaleTimeString()}` : "Loading"}
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 md:grid-cols-3">
            {opportunities.map((item) => (
              <button
                key={item.pair}
                type="button"
                onClick={() => setSelectedOpportunity(item.pair)}
                className={`rounded-md border p-4 text-left transition ${
                  selectedOpportunity === item.pair
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-slate-800 bg-[#0a1421] hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{item.pair}</h3>
                  <span className="rounded bg-slate-900 px-2 py-1 font-mono text-sm font-bold text-white">{item.score}</span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <SignalRow label="Direction" value={item.direction} accent />
                  <SignalRow label="Risk" value={item.risk} />
                  <SignalRow label="RR" value={item.rr} />
                </div>
              </button>
            ))}
            {!opportunities.length && (
              <div className="rounded-md border border-slate-800 bg-[#0a1421] p-4 text-sm text-slate-400">
                Loading opportunity scanner...
              </div>
            )}
          </div>
          <div className="rounded-md border border-slate-800 bg-[#0a1421] p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Selected Setup</p>
            <h3 className="mt-1 text-2xl font-bold text-white">{opportunity.pair}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <Metric label="Score" value={`${opportunity.score}/100`} tone="profit" />
              <Metric label="Direction" value={opportunity.direction} tone={opportunity.direction === "BUY" ? "profit" : "risk"} />
              <Metric label="Risk" value={opportunity.risk} />
              <Metric label="Volatility" value={opportunity.volatility} />
              <Metric label="RR" value={opportunity.rr} />
              <Metric label="Confidence" value={opportunity.confidence} tone="profit" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}) {
  const toneClasses: Record<string, string> = {
    blue: "bg-blue-500/15 text-blue-300",
    green: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    red: "bg-red-500/15 text-red-300",
    violet: "bg-violet-500/15 text-violet-300",
  };

  return (
    <article className="rounded-lg border border-slate-800 bg-[#07101b] p-4">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs text-slate-400">{label}</p>
      <h3 className="mt-1 text-lg font-bold text-white">{value}</h3>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function ResearchCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-[#07101b] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
      <div className="mb-4">
        <TitleBlock icon={icon} title={title} subtitle={subtitle} />
      </div>
      {children}
    </section>
  );
}

function TitleBlock({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600/15 text-blue-300">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "profit" | "risk" }) {
  const color = tone === "profit" ? "text-emerald-300" : tone === "risk" ? "text-red-300" : "text-white";

  return (
    <div className="rounded-md border border-slate-800 bg-[#07101b] p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-1 font-mono text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function SignalRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-[#07101b] px-3 py-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={accent ? "font-semibold text-blue-300" : "font-semibold text-slate-200"}>{value}</span>
    </div>
  );
}

function Progress({ label, value, tone }: { label: string; value: number; tone: "green" | "red" }) {
  const bar = tone === "green" ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-800">
        <div className={`h-full rounded ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function NarrativeBlock({
  icon: Icon,
  title,
  text,
  warning = false,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-md border p-4 ${warning ? "border-amber-400/25 bg-amber-500/10" : "border-slate-800 bg-[#0a1421]"}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${warning ? "text-amber-300" : "text-blue-300"}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function matrixTone(value: number | null) {
  if (value === null) return "font-mono text-slate-500";
  if (value > 0) return "font-mono font-semibold text-emerald-300";
  return "font-mono font-semibold text-red-300";
}
