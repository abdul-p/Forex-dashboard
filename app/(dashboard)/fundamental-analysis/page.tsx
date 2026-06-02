"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BarChart3,
  Brain,
  CalendarClock,
  ChevronDown,
  CircleDot,
  Globe2,
  Landmark,
  Percent,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "EUR/GBP"];

type FundamentalPayload = {
  symbol: string;
  generatedAt: string;
  sources: Record<string, string>;
  globalOverview: {
    riskSentiment: {
      label: string;
      detail: string;
    };
    strongestEconomy: {
      code: string;
      country: string;
      score: number;
    };
    weakestEconomy: {
      code: string;
      country: string;
      score: number;
    };
    globalInflationTrend: string;
    rateOutlook: string;
  };
  calendar: {
    upcomingEvents: {
      event: string;
      country: string;
      impact: string;
      forecast: string;
      previous: string;
      actual: string;
      countdown: string;
      date: string;
    }[];
    nextHighImpact: {
      event: string;
      countdown: string;
      impact: string;
      country: string;
    } | null;
    highImpactCount: number;
  };
  centralBanks: {
    bank: string;
    country: string;
    rate: string;
    stance: string;
    lastDecision: string;
    nextMeeting: string;
    source: string;
  }[];
  interestRates: {
    rows: {
      country: string;
      code: string;
      rate: string;
      diff: string;
      stance: string;
    }[];
    differential: {
      pair: string;
      value: string;
    };
  };
  inflation: {
    rows: {
      country: string;
      code: string;
      current: string;
      previous: string;
      trend: string;
    }[];
  };
  employment: {
    rows: {
      country: string;
      code: string;
      unemployment: string;
      trend: string;
    }[];
  };
  gdp: {
    rows: {
      country: string;
      code: string;
      current: string;
      previous: string;
      trend: string;
    }[];
  };
  scorecard: {
    code: string;
    country: string;
    score: number;
    reason: string;
  }[];
  currencyStrength: {
    code: string;
    country: string;
    score: number;
    reason: string;
  }[];
  ai: {
    narrative: string;
    forecast: string;
    eventImpact: string;
    newsSentiment: {
      label: string;
      score: number;
      detail: string;
    };
  };
};

const defaultPayload: FundamentalPayload = {
  symbol: "EUR/USD",
  generatedAt: "",
  sources: {},
  globalOverview: {
    riskSentiment: { label: "Loading", detail: "Fetching live macro data" },
    strongestEconomy: { code: "--", country: "Loading", score: 0 },
    weakestEconomy: { code: "--", country: "Loading", score: 0 },
    globalInflationTrend: "Loading",
    rateOutlook: "Loading",
  },
  calendar: {
    upcomingEvents: [],
    nextHighImpact: null,
    highImpactCount: 0,
  },
  centralBanks: [],
  interestRates: {
    rows: [],
    differential: { pair: "EUR/USD", value: "Loading" },
  },
  inflation: { rows: [] },
  employment: { rows: [] },
  gdp: { rows: [] },
  scorecard: [],
  currencyStrength: [],
  ai: {
    narrative: "Loading live economic intelligence...",
    forecast: "Loading",
    eventImpact: "Loading",
    newsSentiment: { label: "Loading", score: 0, detail: "Loading" },
  },
};

export default function FundamentalAnalysisPage() {
  const [selectedPair, setSelectedPair] = useState("EUR/USD");
  const [pairSearch, setPairSearch] = useState("EUR/USD");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [analysis, setAnalysis] = useState<FundamentalPayload>(defaultPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredPairs = PAIRS.filter((pair) => pair.toLowerCase().includes(pairSearch.toLowerCase()));

  useEffect(() => {
    let active = true;

    const loadAnalysis = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/fundamental-analysis?symbol=${encodeURIComponent(selectedPair)}`);
        const data = (await response.json()) as FundamentalPayload | { message?: string };
        if (!response.ok) {
          throw new Error("message" in data ? data.message : "Failed to load fundamental analysis");
        }

        if (active) {
          setAnalysis(data as FundamentalPayload);
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load fundamental analysis");
          setAnalysis(defaultPayload);
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

  const pairCurrencies = useMemo(() => selectedPair.split("/") as [string, string], [selectedPair]);

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
    setPairSearch(pair);
    setPairDropdownOpen(false);
  };

  const strongest = analysis.globalOverview.strongestEconomy;
  const weakest = analysis.globalOverview.weakestEconomy;

  return (
    <div className="space-y-6 text-slate-100">
      <header className="rounded-lg border border-slate-800 bg-[#07101b] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <Landmark className="h-4 w-4" />
              Fundamental Analysis Center
            </div>
            <h1 className="text-2xl font-bold text-white">Economic Forces Driving Currency Movement</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Track calendar risk, central banks, inflation, employment, GDP, rates, and currency strength before taking a trade.
            </p>
            <div className="mt-3 inline-flex rounded border border-slate-800 bg-[#0a1421] px-3 py-1.5 text-xs text-slate-300">
              Focus: <span className="ml-2 font-semibold text-white">{pairCurrencies[0]}</span>
              <span className="mx-2 text-slate-500">/</span>
              <span className="font-semibold text-white">{pairCurrencies[1]}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
              {Object.entries(analysis.sources).map(([key, value]) => (
                <span key={key} className="rounded border border-slate-800 bg-[#0a1421] px-2 py-1">
                  {key}: {value}
                </span>
              ))}
              {loading && <span className="rounded border border-slate-800 bg-[#0a1421] px-2 py-1">Loading live fundamentals...</span>}
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
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <OverviewCard
          icon={TrendingUp}
          label="Risk Sentiment"
          value={analysis.globalOverview.riskSentiment.label}
          detail={analysis.globalOverview.riskSentiment.detail}
          tone={analysis.globalOverview.riskSentiment.label === "Risk-On" ? "profit" : analysis.globalOverview.riskSentiment.label === "Risk-Off" ? "risk" : "neutral"}
        />
        <OverviewCard
          icon={Globe2}
          label="Strongest Economy"
          value={strongest.country}
          detail={`${strongest.code} ${strongest.score}/100`}
          tone="profit"
        />
        <OverviewCard
          icon={ShieldAlert}
          label="Weakest Economy"
          value={weakest.country}
          detail={`${weakest.code} ${weakest.score}/100`}
          tone="risk"
        />
        <OverviewCard
          icon={Percent}
          label="Inflation Trend"
          value={analysis.globalOverview.globalInflationTrend}
          detail="Latest available CPI changes"
          tone="neutral"
        />
        <OverviewCard
          icon={ArrowRight}
          label="Rate Outlook"
          value="Policy Watch"
          detail={analysis.globalOverview.rateOutlook}
          tone="neutral"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ResearchCard icon={CalendarClock} title="Economic Calendar" subtitle={`${analysis.calendar.highImpactCount} high-impact event(s) in focus`}>
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  {["Event", "Country", "Impact", "Forecast", "Previous", "Actual", "Countdown"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.calendar.upcomingEvents.map((event) => (
                  <tr key={`${event.event}-${event.date}`} className="border-b border-slate-800/70 text-slate-300">
                    <td className="px-3 py-3 font-medium text-white">{event.event}</td>
                    <td className="px-3 py-3">{event.country}</td>
                    <td className="px-3 py-3">
                      <ImpactPill impact={event.impact} />
                    </td>
                    <td className="px-3 py-3 font-mono">{event.forecast}</td>
                    <td className="px-3 py-3 font-mono">{event.previous}</td>
                    <td className="px-3 py-3 font-mono">{event.actual}</td>
                    <td className="px-3 py-3 font-mono text-blue-300">{event.countdown}</td>
                  </tr>
                ))}
                {!analysis.calendar.upcomingEvents.length && (
                  <tr>
                    <td colSpan={7} className="px-3 py-5 text-slate-400">
                      No live calendar events matched the current pair filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {analysis.calendar.nextHighImpact && (
            <div className="mt-4 rounded-md border border-amber-400/25 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-sm text-amber-100">
                  Next high-impact event: {analysis.calendar.nextHighImpact.event} in {analysis.calendar.nextHighImpact.countdown}.
                </p>
              </div>
            </div>
          )}
        </ResearchCard>

        <ResearchCard icon={Banknote} title="Central Bank Tracker" subtitle="Current rate and stance summary">
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-800">
                  {["Bank", "Rate", "Stance", "Last Decision", "Next Meeting"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.centralBanks.map((bank) => (
                  <tr key={bank.bank} className="border-b border-slate-800/70 text-slate-300">
                    <td className="px-3 py-3">
                      <div className="font-medium text-white">{bank.bank}</div>
                      <div className="text-[11px] text-slate-500">{bank.country}</div>
                    </td>
                    <td className="px-3 py-3 font-mono">{bank.rate}</td>
                    <td className="px-3 py-3">
                      <ImpactPill impact={bank.stance === "Hawkish" ? "High" : bank.stance === "Dovish" ? "Low" : "Medium"} label={bank.stance} />
                    </td>
                    <td className="px-3 py-3">{bank.lastDecision}</td>
                    <td className="px-3 py-3">{bank.nextMeeting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Rates use the latest available public source readings and policy-rate feeds when configured.
          </p>
        </ResearchCard>

        <ResearchCard icon={BarChart3} title="Interest Rate Dashboard" subtitle="Rate differential and stance comparison">
          <div className="mb-4 rounded-md border border-slate-800 bg-[#07101b] p-3">
            <p className="text-xs text-slate-400">Rate Differential</p>
            <p className="mt-1 font-mono text-2xl font-bold text-white">{analysis.interestRates.differential.value}</p>
            <p className="mt-1 text-xs text-slate-500">{analysis.interestRates.differential.pair}</p>
          </div>
          <div className="space-y-2">
            {analysis.interestRates.rows.map((row) => (
              <MetricRow key={row.code} label={row.country} value={row.rate} detail={`${row.stance}${row.diff ? ` | ${row.diff}` : ""}`} />
            ))}
          </div>
        </ResearchCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ResearchCard icon={Percent} title="Inflation Dashboard" subtitle="CPI trend and current print by economy">
          <div className="space-y-2">
            {analysis.inflation.rows.map((row) => (
              <MetricRow key={row.code} label={row.country} value={row.current} detail={`${row.previous} | ${row.trend}`} />
            ))}
          </div>
        </ResearchCard>

        <ResearchCard icon={Globe2} title="Employment Dashboard" subtitle="Labor market readings and trend">
          <div className="space-y-2">
            {analysis.employment.rows.map((row) => (
              <MetricRow key={row.code} label={row.country} value={row.unemployment} detail={row.trend} />
            ))}
          </div>
        </ResearchCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ResearchCard icon={TrendingUp} title="GDP Dashboard" subtitle="Growth momentum and latest available trend">
          <div className="space-y-2">
            {analysis.gdp.rows.map((row) => (
              <MetricRow key={row.code} label={row.country} value={row.current} detail={`${row.previous} | ${row.trend}`} />
            ))}
          </div>
        </ResearchCard>

        <ResearchCard icon={BarChart3} title="Economic Health Scorecard" subtitle="Composite ranking from inflation, employment, GDP, and rates">
          <div className="space-y-3">
            {analysis.scorecard.map((row) => (
              <div key={row.code} className="rounded-md border border-slate-800 bg-[#07101b] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.country}</p>
                    <p className="text-[11px] text-slate-500">{row.reason}</p>
                  </div>
                  <p className="font-mono text-lg font-bold text-white">{row.score}/100</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded bg-slate-800">
                  <div className="h-full rounded bg-blue-500" style={{ width: `${row.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ResearchCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ResearchCard icon={Sparkles} title="Currency Fundamental Strength" subtitle="Macro rankings converted into tradable currency strength">
          <div className="space-y-3">
            {analysis.currencyStrength.map((row, index) => (
              <div key={row.code} className="rounded-md border border-slate-800 bg-[#07101b] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">#{index + 1}</p>
                    <p className="text-sm font-semibold text-white">
                      {row.code} <span className="text-slate-500">{row.country}</span>
                    </p>
                  </div>
                  <p className="font-mono text-lg font-bold text-emerald-300">{row.score}</p>
                </div>
                <p className="mt-2 text-xs text-slate-400">{row.reason}</p>
              </div>
            ))}
          </div>
        </ResearchCard>

        <ResearchCard icon={Brain} title="AI Economic Intelligence" subtitle="Narrative, forecast, and event impact">
          <div className="space-y-3">
            <NarrativeBlock icon={Sparkles} title="Market Narrative" text={analysis.ai.narrative} />
            <NarrativeBlock icon={TrendingUp} title="Forecast Engine" text={analysis.ai.forecast} />
            <NarrativeBlock icon={AlertTriangle} title="Event Impact Prediction" text={analysis.ai.eventImpact} warning />
            <div className="rounded-md border border-slate-800 bg-[#07101b] p-3">
              <p className="text-xs text-slate-400">News Sentiment</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {analysis.ai.newsSentiment.label} {analysis.ai.newsSentiment.score}/100
              </p>
              <p className="mt-1 text-xs text-slate-500">{analysis.ai.newsSentiment.detail}</p>
            </div>
          </div>
        </ResearchCard>
      </section>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "profit" | "risk" | "neutral";
}) {
  const toneClasses = {
    profit: "bg-emerald-500/15 text-emerald-300",
    risk: "bg-red-500/15 text-red-300",
    neutral: "bg-blue-500/15 text-blue-300",
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
  icon: Icon,
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
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-600/15 text-blue-300">
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </span>
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-[#07101b] px-3 py-2 text-xs">
      <div>
        <p className="text-slate-400">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
      </div>
      <p className="font-mono font-semibold text-white">{value}</p>
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
    <div className={`rounded-md border p-3 ${warning ? "border-amber-400/25 bg-amber-500/10" : "border-slate-800 bg-[#07101b]"}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${warning ? "text-amber-300" : "text-blue-300"}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function ImpactPill({ impact, label }: { impact: string; label?: string }) {
  const tone =
    impact === "High"
      ? "border-red-400/30 bg-red-500/10 text-red-300"
      : impact === "Medium"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";

  return (
    <span className={`rounded border px-2 py-1 text-[11px] font-semibold ${tone}`}>
      {label ?? impact}
    </span>
  );
}
