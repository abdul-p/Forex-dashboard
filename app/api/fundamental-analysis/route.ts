import { NextRequest, NextResponse } from "next/server";

type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF";

type EconomyCode = {
  countryName: string;
  worldBankCodes: string[];
  fredPrefix?: string;
};

type IndicatorKey = "inflation" | "employment" | "gdp" | "rates";

type WorldBankRow = {
  country?: { id?: string; value?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | string | null;
};

type WorldBankResponse = [unknown, WorldBankRow[]];

type CalendarEvent = {
  title?: string;
  event?: string;
  country: string;
  date: string;
  time?: string;
  impact?: string | number;
  forecast?: string;
  previous?: string;
  actual?: string;
  source?: string;
  currency?: string;
};

type NewsArticle = {
  title?: string;
  source_id?: string;
  pubDate?: string;
  link?: string;
};

type EconomyMetrics = {
  code: CurrencyCode;
  country: string;
  inflation: number | null;
  unemployment: number | null;
  gdp: number | null;
  rate: number | null;
  inflationChange: number | null;
  unemploymentChange: number | null;
  gdpChange: number | null;
  rateChange: number | null;
  score: number;
  stance: "Hawkish" | "Neutral" | "Dovish";
  source: string;
};

const ECONOMIES: Record<CurrencyCode, EconomyCode> = {
  USD: { countryName: "United States", worldBankCodes: ["USA"], fredPrefix: "US" },
  EUR: { countryName: "Euro Area", worldBankCodes: ["EMU", "EUU"] },
  GBP: { countryName: "United Kingdom", worldBankCodes: ["GBR"] },
  JPY: { countryName: "Japan", worldBankCodes: ["JPN"] },
  AUD: { countryName: "Australia", worldBankCodes: ["AUS"] },
  CAD: { countryName: "Canada", worldBankCodes: ["CAN"] },
  CHF: { countryName: "Switzerland", worldBankCodes: ["CHE"] },
};

const PAIR_MAP: Record<string, [CurrencyCode, CurrencyCode]> = {
  "EUR/USD": ["EUR", "USD"],
  "GBP/USD": ["GBP", "USD"],
  "USD/JPY": ["USD", "JPY"],
  "USD/CHF": ["USD", "CHF"],
  "AUD/USD": ["AUD", "USD"],
  "USD/CAD": ["USD", "CAD"],
  "NZD/USD": ["USD", "USD"],
  "EUR/GBP": ["EUR", "GBP"],
};

const WORLD_BANK_INDICATORS: Record<IndicatorKey, string> = {
  inflation: "FP.CPI.TOTL.ZG",
  employment: "SL.UEM.TOTL.ZS",
  gdp: "NY.GDP.MKTP.KD.ZG",
  rates: "FR.INR.LEND",
};

const POSITIVE_WORDS = ["beat", "strong", "surge", "growth", "hawkish", "higher", "resilient", "falling", "cooling"];
const NEGATIVE_WORDS = ["miss", "weak", "slump", "dovish", "lower", "rising", "sticky", "inflationary", "recession"];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

const pairCurrencies = (symbol: string) => PAIR_MAP[symbol] ?? ["USD", "EUR"];

async function fetchWorldBankIndicator(codes: string[], indicator: string) {
  const response = await fetch(
    `https://api.worldbank.org/v2/country/${codes.join(";")}/indicator/${indicator}?format=json&per_page=1000`,
    { next: { revalidate: 24 * 60 * 60 } },
  );
  const data = (await response.json()) as WorldBankResponse;
  return data?.[1] ?? [];
}

function parseWorldBankRows(rows: WorldBankRow[]) {
  const byCountry = new Map<string, WorldBankRow[]>();
  for (const row of rows) {
    const codes = [row.country?.id, row.countryiso3code].filter((code): code is string => Boolean(code));
    for (const code of codes) {
      if (!byCountry.has(code)) {
        byCountry.set(code, []);
      }
      byCountry.get(code)?.push(row);
    }
  }

  return byCountry;
}

function latestValue(rows: WorldBankRow[] | undefined) {
  const numericRows = (rows ?? [])
    .map((row) => ({
      date: row.date ?? "",
      value: row.value === null || row.value === undefined || row.value === "" ? Number.NaN : typeof row.value === "number" ? row.value : Number(row.value),
    }))
    .filter((row) => Number.isFinite(row.value));

  if (!numericRows.length) return { latest: null, previous: null };
  numericRows.sort((first, second) => Number(second.date) - Number(first.date));
  const [latest, previous] = numericRows;
  return { latest: latest?.value ?? null, previous: previous?.value ?? null };
}

async function fetchFredSeries(seriesId: string) {
  if (!process.env.FRED_API_KEY) {
    return { latest: null, previous: null };
  }

  const response = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${process.env.FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`,
    { next: { revalidate: 24 * 60 * 60 } },
  );
  const data = (await response.json()) as { observations?: { value?: string }[] };
  const observations = data.observations ?? [];
  const latest = Number(observations[0]?.value);
  const previous = Number(observations[1]?.value);

  return {
    latest: Number.isFinite(latest) ? latest : null,
    previous: Number.isFinite(previous) ? previous : null,
  };
}

async function fetchCalendar() {
  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      next: { revalidate: 60 * 60 },
    });
    const data = (await response.json()) as CalendarEvent[];
    return data ?? [];
  } catch {
    return [];
  }
}

async function fetchNews() {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&q=forex+macro+economy&language=en&category=business`,
      { next: { revalidate: 30 * 60 } },
    );
    const data = (await response.json()) as { results?: NewsArticle[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

function deriveStance(rate: number | null, inflation: number | null, gdp: number | null) {
  if (rate === null) return "Neutral";
  if (inflation !== null && inflation > 3 && rate > 3) return "Hawkish";
  if (gdp !== null && gdp < 1.5) return "Dovish";
  if (rate > 3.5) return "Hawkish";
  if (rate < 1.5) return "Dovish";
  return "Neutral";
}

function scoreEconomy(inflation: number | null, unemployment: number | null, gdp: number | null, rate: number | null) {
  const inflationScore = inflation === null ? 50 : clamp(100 - Math.abs(inflation - 2) * 18, 0, 100);
  const unemploymentScore = unemployment === null ? 50 : clamp(100 - unemployment * 8, 0, 100);
  const gdpScore = gdp === null ? 50 : clamp(50 + gdp * 10, 0, 100);
  const rateScore = rate === null ? 50 : clamp(45 + rate * 6, 0, 100);
  return Math.round(inflationScore * 0.3 + unemploymentScore * 0.25 + gdpScore * 0.3 + rateScore * 0.15);
}

function inferRiskSentiment(scores: EconomyMetrics[]) {
  const jpy = scores.find((item) => item.code === "JPY");
  const aud = scores.find((item) => item.code === "AUD");
  const gbp = scores.find((item) => item.code === "GBP");
  const riskBias = (aud?.score ?? 50) + (gbp?.score ?? 50) - (jpy?.score ?? 50);
  if (riskBias > 90) return { label: "Risk-On", detail: "Higher beta currencies are better supported" };
  if (riskBias < 70) return { label: "Risk-Off", detail: "Defensive demand is stronger" };
  return { label: "Neutral", detail: "Mixed macro conditions" };
}

function scoreNews(news: NewsArticle[]) {
  if (!news.length) {
    return { label: "Unavailable", score: 0, detail: "NewsData feed empty or unavailable" };
  }

  const score = news.reduce((acc, article) => {
    const title = (article.title ?? "").toLowerCase();
    const positive = POSITIVE_WORDS.some((word) => title.includes(word)) ? 1 : 0;
    const negative = NEGATIVE_WORDS.some((word) => title.includes(word)) ? 1 : 0;
    return acc + positive - negative;
  }, 0);

  const normalized = clamp(50 + (score / Math.max(news.length, 1)) * 50, 0, 100);
  const label = normalized >= 58 ? "Positive" : normalized <= 42 ? "Negative" : "Neutral";
  return {
    label,
    score: Math.round(normalized),
    detail: `${news.length} headlines scored`,
  };
}

function calendarCountdown(dateString?: string, timeString?: string) {
  if (!dateString) return "TBD";
  const raw = `${dateString} ${timeString ?? ""}`.trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return dateString;
  const diff = parsed.getTime() - Date.now();
  if (diff <= 0) return "Live/Passed";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function classifyImpact(impact?: string | number) {
  if (typeof impact === "number") {
    if (impact >= 3) return "High";
    if (impact === 2) return "Medium";
    return "Low";
  }
  const text = String(impact ?? "").toLowerCase();
  if (text.includes("high")) return "High";
  if (text.includes("medium")) return "Medium";
  if (text.includes("low")) return "Low";
  return "Medium";
}

export async function GET(req: NextRequest) {
  const symbol = new URL(req.url).searchParams.get("symbol") || "EUR/USD";
  const [base, quote] = pairCurrencies(symbol);
  const currencies = [...new Set([base, quote, "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"])] as CurrencyCode[];
  const bankCodes = [...new Set(currencies.flatMap((currency) => ECONOMIES[currency].worldBankCodes))];

  try {
    const [inflationDataRows, employmentDataRows, gdpDataRows, rateDataRows, calendar, news, fredInflation, fredEmployment, fredGdp, fredUsd] = await Promise.all([
      fetchWorldBankIndicator(bankCodes, WORLD_BANK_INDICATORS.inflation),
      fetchWorldBankIndicator(bankCodes, WORLD_BANK_INDICATORS.employment),
      fetchWorldBankIndicator(bankCodes, WORLD_BANK_INDICATORS.gdp),
      fetchWorldBankIndicator(bankCodes, WORLD_BANK_INDICATORS.rates),
      fetchCalendar(),
      fetchNews(),
      fetchFredSeries("CPIAUCSL"),
      fetchFredSeries("UNRATE"),
      fetchFredSeries("GDP"),
      fetchFredSeries("FEDFUNDS"),
    ]);

    const inflationMap = parseWorldBankRows(inflationDataRows);
    const employmentMap = parseWorldBankRows(employmentDataRows);
    const gdpMap = parseWorldBankRows(gdpDataRows);
    const rateMap = parseWorldBankRows(rateDataRows);

    const economies: EconomyMetrics[] = currencies.map((code) => {
      const worldBankCode = ECONOMIES[code].worldBankCodes.find((candidate) =>
        [...inflationMap.keys(), ...employmentMap.keys(), ...gdpMap.keys(), ...rateMap.keys()].includes(candidate),
      ) ?? ECONOMIES[code].worldBankCodes[0];

      const inflationSeries = inflationMap.get(worldBankCode) ?? [];
      const employmentSeries = employmentMap.get(worldBankCode) ?? [];
      const gdpSeries = gdpMap.get(worldBankCode) ?? [];
      const rateSeries = rateMap.get(worldBankCode) ?? [];

      let { latest: inflation, previous: inflationPrevious } = latestValue(inflationSeries);
      let { latest: unemployment, previous: unemploymentPrevious } = latestValue(employmentSeries);
      let { latest: gdp, previous: gdpPrevious } = latestValue(gdpSeries);
      let { latest: rate, previous: ratePrevious } = latestValue(rateSeries);

      if (code === "USD" && fredUsd.latest !== null) {
        rate = fredUsd.latest;
        ratePrevious = fredUsd.previous;
        inflation = fredInflation.latest;
        inflationPrevious = fredInflation.previous;
        unemployment = fredEmployment.latest;
        unemploymentPrevious = fredEmployment.previous;
        gdp = fredGdp.latest;
        gdpPrevious = fredGdp.previous;
      }

      const score = scoreEconomy(inflation, unemployment, gdp, rate);

      return {
        code,
        country: ECONOMIES[code].countryName,
        inflation,
        unemployment,
        gdp,
        rate,
        inflationChange: inflation !== null && inflationPrevious !== null ? round(inflation - inflationPrevious, 2) : null,
        unemploymentChange: unemployment !== null && unemploymentPrevious !== null ? round(unemployment - unemploymentPrevious, 2) : null,
        gdpChange: gdp !== null && gdpPrevious !== null ? round(gdp - gdpPrevious, 2) : null,
        rateChange: rate !== null && ratePrevious !== null ? round(rate - ratePrevious, 2) : null,
        score,
        stance: deriveStance(rate, inflation, gdp),
        source: code === "USD" && fredUsd.latest !== null ? "FRED + World Bank" : "World Bank",
      };
    });

    const strongest = [...economies].sort((first, second) => second.score - first.score)[0];
    const weakest = [...economies].sort((first, second) => first.score - second.score)[0];
    const riskSentiment = inferRiskSentiment(economies);
    const inflationChanges = economies
      .map((item) => item.inflationChange)
      .filter((value): value is number => typeof value === "number");
    const inflationTrend =
      inflationChanges.length > 0 && inflationChanges.every((value) => value < 0)
        ? "Moderating"
        : inflationChanges.length > 0 && inflationChanges.some((value) => value > 0)
          ? "Sticky"
          : "Stable";

    const upcomingEvents = calendar
      .map((event) => ({
        event: event.title ?? event.event ?? "Economic event",
        country: event.country ?? "",
        impact: classifyImpact(event.impact),
        forecast: event.forecast ?? "N/A",
        previous: event.previous ?? "N/A",
        actual: event.actual ?? "Pending",
        countdown: calendarCountdown(event.date, event.time),
        date: event.date ?? "",
      }))
      .filter((event) => {
        const country = event.country.toLowerCase();
        return [base, quote, ECONOMIES[base].countryName, ECONOMIES[quote].countryName].some((needle) =>
          country.includes(needle.toLowerCase()),
        );
      })
      .slice(0, 8);

    const nextHighImpact = upcomingEvents.find((event) => event.impact === "High") ?? upcomingEvents[0] ?? null;

    const calendarByCountry = upcomingEvents.filter((event) => event.impact === "High");

    const centralBanks = economies.map((economy) => {
      const bank =
        economy.code === "USD"
          ? "Fed"
          : economy.code === "EUR"
            ? "ECB"
            : economy.code === "GBP"
              ? "BOE"
              : economy.code === "JPY"
                ? "BOJ"
                : economy.code === "AUD"
                  ? "RBA"
                  : economy.code === "CAD"
                    ? "BOC"
                    : "SNB";
      const meetingKeyword = bank.toLowerCase();

      return {
        bank,
        country: economy.country,
        rate: economy.rate !== null && economy.rate !== undefined ? `${economy.rate.toFixed(2)}%` : "N/A",
        stance: economy.stance,
        lastDecision:
          economy.rateChange === null
            ? "Latest available"
            : economy.rateChange > 0
              ? "Raised recently"
              : economy.rateChange < 0
                ? "Cut recently"
                : "Held steady",
        nextMeeting:
          upcomingEvents.find((event) => {
            const haystack = `${event.event} ${event.country}`.toLowerCase();
            return haystack.includes("rate decision") || haystack.includes("policy") || haystack.includes("meeting") || haystack.includes(meetingKeyword) || haystack.includes(bank.toLowerCase()) || haystack.includes(economy.country.toLowerCase());
          })?.countdown ?? "TBD",
        source: economy.source,
      };
    });

    const rateRows = economies.map((economy) => ({
      country: economy.country,
      code: economy.code,
      rate: economy.rate !== null && economy.rate !== undefined ? `${economy.rate.toFixed(2)}%` : "N/A",
      diff:
        economy.code === base && quote
          ? (() => {
              const quoteRate = economies.find((item) => item.code === quote)?.rate ?? null;
              if (quoteRate === null || economy.rate === null) return "N/A";
              return `${(economy.rate - quoteRate).toFixed(2)}%`;
            })()
          : "",
      stance: economy.stance,
    }));

    const inflationRows = economies.map((economy) => ({
      country: economy.country,
      code: economy.code,
      current: economy.inflation !== null && economy.inflation !== undefined ? `${economy.inflation.toFixed(1)}%` : "N/A",
      previous: economy.inflationChange !== null ? (economy.inflation! - economy.inflationChange).toFixed(1) + "%" : "N/A",
      trend: economy.inflationChange === null ? "Stable" : economy.inflationChange < 0 ? "Falling" : economy.inflationChange > 0 ? "Rising" : "Stable",
    }));

    const employmentRows = economies.map((economy) => ({
      country: economy.country,
      code: economy.code,
      unemployment: economy.unemployment !== null && economy.unemployment !== undefined ? `${economy.unemployment.toFixed(1)}%` : "N/A",
      trend: economy.unemploymentChange === null ? "Stable" : economy.unemploymentChange < 0 ? "Improving" : economy.unemploymentChange > 0 ? "Worsening" : "Stable",
    }));

    const gdpRows = economies.map((economy) => ({
      country: economy.country,
      code: economy.code,
      current: economy.gdp !== null && economy.gdp !== undefined ? `${economy.gdp.toFixed(1)}%` : "N/A",
      previous: economy.gdpChange !== null ? `${(economy.gdp! - economy.gdpChange).toFixed(1)}%` : "N/A",
      trend: economy.gdpChange === null ? "Stable" : economy.gdpChange > 0 ? "Accelerating" : economy.gdpChange < 0 ? "Slowing" : "Stable",
    }));

    const strongestCurrencies = [...economies]
      .map((economy) => ({
        code: economy.code,
        country: economy.country,
        score: economy.score,
        reason: [
          economy.inflation !== null ? `Inflation ${economy.inflation.toFixed(1)}%` : null,
          economy.unemployment !== null ? `Unemployment ${economy.unemployment.toFixed(1)}%` : null,
          economy.gdp !== null ? `GDP ${economy.gdp.toFixed(1)}%` : null,
          economy.rate !== null ? `Rate ${economy.rate.toFixed(2)}%` : null,
        ]
          .filter(Boolean)
          .slice(0, 3)
          .join(", "),
      }))
      .sort((first, second) => second.score - first.score);

    const pairStrength = {
      base: economies.find((economy) => economy.code === base),
      quote: economies.find((economy) => economy.code === quote),
    };
    const pairDifferential =
      pairStrength.base && pairStrength.quote && pairStrength.base.rate !== null && pairStrength.quote.rate !== null
        ? `${(pairStrength.base.rate - pairStrength.quote.rate).toFixed(2)}%`
        : "N/A";

    const newsSentiment = scoreNews(news);

    const rateOutlook =
      pairStrength.base && pairStrength.quote
        ? `${base} rate ${pairStrength.base.rate !== null ? pairStrength.base.rate.toFixed(2) + "%" : "N/A"} vs ${quote} rate ${pairStrength.quote.rate !== null ? pairStrength.quote.rate.toFixed(2) + "%" : "N/A"}`
        : "Rate data unavailable";

    const aiNarrative = `${strongest.country} currently screens strongest on the macro scorecard, while ${weakest.country} is lagging on the latest available inflation, employment, GDP, and rate readings.`;

    return NextResponse.json({
      symbol,
      generatedAt: new Date().toISOString(),
      sources: {
        macro: "World Bank",
        policy: process.env.FRED_API_KEY ? "FRED + World Bank" : "World Bank",
        calendar: "Forex Factory weekly calendar",
        news: process.env.NEWSDATA_API_KEY ? "NewsData" : "Unavailable",
      },
      globalOverview: {
        riskSentiment,
        strongestEconomy: strongest,
        weakestEconomy: weakest,
        globalInflationTrend: inflationTrend,
        rateOutlook,
      },
      calendar: {
        upcomingEvents,
        nextHighImpact,
        highImpactCount: calendarByCountry.length,
      },
      centralBanks,
      interestRates: {
        rows: rateRows,
        differential: {
          pair: symbol,
          value: pairDifferential,
        },
      },
      inflation: {
        rows: inflationRows,
      },
      employment: {
        rows: employmentRows,
      },
      gdp: {
        rows: gdpRows,
      },
      scorecard: strongestCurrencies,
      currencyStrength: strongestCurrencies,
      ai: {
        narrative: aiNarrative,
        forecast: `${strongest.code} remains the strongest macro currency with a score of ${strongest.score}/100.`,
        eventImpact: nextHighImpact
          ? `${nextHighImpact.event} is the next major event (${nextHighImpact.countdown}) and is likely to drive volatility.`
          : "No high-impact event is currently filtered for this pair.",
        newsSentiment,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build fundamental analysis";
    return NextResponse.json({ message }, { status: 500 });
  }
}
