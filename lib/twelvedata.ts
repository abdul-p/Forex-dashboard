const API_KEY = process.env.TWELVE_DATA_API_KEY;
const BASE_URL = "https://api.twelvedata.com";

export const FOREX_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/GBP",
];

export async function getQuotes() {
  const symbols = FOREX_PAIRS.join(",");
  const res = await fetch(
    `${BASE_URL}/price?symbol=${symbols}&apikey=${API_KEY}`,
    { next: { revalidate: 60 } },
  );
  const data = await res.json();
  return data;
}

export async function getTimeSeries(symbol: string, interval: string = "1h") {
  const res = await fetch(
    `${BASE_URL}/time_series?symbol=${symbol}&interval=${interval}&outputsize=50&apikey=${API_KEY}`,
    { next: { revalidate: 300 } },
  );
  const data = await res.json();
  return data;
}

export async function getExchangeRate(symbol: string) {
  const res = await fetch(
    `${BASE_URL}/exchange_rate?symbol=${symbol}&apikey=${API_KEY}`,
    { next: { revalidate: 60 } },
  );
  const data = await res.json();
  return data;
}
