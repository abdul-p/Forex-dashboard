"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface Stats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  totalProfit: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  balance: number;
}

interface EquityPoint {
  date: string;
  equity: number;
  profit: number;
}

interface PairStat {
  trades: number;
  profit: number;
}

export default function PortfolioPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [equityCurve, setEquityCurve] = useState<EquityPoint[]>([]);
  const [pairStats, setPairStats] = useState<Record<string, PairStat>>({});
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      setStats(data.stats);
      setEquityCurve(data.equityCurve);
      setPairStats(data.pairStats);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const pairChartData = Object.entries(pairStats).map(([pair, data]) => ({
    pair,
    profit: parseFloat(data.profit.toFixed(2)),
    trades: data.trades,
  }));

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-600">
        Loading portfolio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your trading performance and analytics
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Account Balance",
            value: `$${stats?.balance.toLocaleString()}`,
            sub: "Current balance",
            color: "text-green-400",
          },
          {
            label: "Total P&L",
            value: `${(stats?.totalProfit || 0) >= 0 ? "+" : ""}$${stats?.totalProfit.toFixed(2)}`,
            sub: `${stats?.closedTrades} closed trades`,
            color:
              (stats?.totalProfit || 0) >= 0
                ? "text-green-400"
                : "text-red-400",
          },
          {
            label: "Win Rate",
            value: `${stats?.winRate}%`,
            sub: `${stats?.closedTrades} total closed`,
            color:
              (stats?.winRate || 0) >= 50 ? "text-green-400" : "text-red-400",
          },
          {
            label: "Profit Factor",
            value:
              stats?.profitFactor === 999
                ? "∞"
                : stats?.profitFactor.toFixed(2),
            sub: "Avg win / avg loss",
            color:
              (stats?.profitFactor || 0) >= 1
                ? "text-green-400"
                : "text-red-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-500 text-xs mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-600 text-xs mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Trades", value: stats?.totalTrades },
          { label: "Open Trades", value: stats?.openTrades },
          {
            label: "Avg Win",
            value: `$${stats?.avgWin.toFixed(2)}`,
          },
          {
            label: "Avg Loss",
            value: `$${stats?.avgLoss.toFixed(2)}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-500 text-xs mb-2">{stat.label}</p>
            <p className="text-white font-bold text-xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-1">Equity Curve</h2>
        <p className="text-gray-500 text-xs mb-6">Account balance over time</p>

        {equityCurve.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-600">
            No closed trades yet — close some trades to see your equity curve
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "#4b5563", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(value) => [
                  `$${Number(value).toLocaleString()}`,
                  "Equity",
                ]}
                labelStyle={{ color: "#6b7280" }}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#4ade80"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#4ade80" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pair Breakdown */}
      {pairChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">P&L by Pair</h2>
            <p className="text-gray-500 text-xs mb-6">
              Profit and loss per currency pair
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pairChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="pair"
                  tick={{ fill: "#4b5563", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#4b5563", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1f2937",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "P&L"]}
                />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {pairChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.profit >= 0 ? "#4ade80" : "#f87171"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pair Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-1">Pair Summary</h2>
            <p className="text-gray-500 text-xs mb-4">
              Performance breakdown by pair
            </p>
            <div className="space-y-2">
              {pairChartData
                .sort((a, b) => b.profit - a.profit)
                .map((item) => (
                  <div
                    key={item.pair}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {item.pair}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {item.trades} trade{item.trades !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        item.profit >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {item.profit >= 0 ? "+" : ""}${item.profit.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
