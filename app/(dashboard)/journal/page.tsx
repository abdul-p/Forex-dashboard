"use client";

import { useState, useEffect } from "react";

interface Trade {
  _id: string;
  pair: string;
  type: "buy" | "sell";
  entryPrice: number;
  exitPrice?: number;
  lotSize: number;
  profit?: number;
  status: "open" | "closed";
  note?: string;
  openedAt: string;
  closedAt?: string;
}

const PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "USD/CAD",
  "NZD/USD",
  "EUR/GBP",
];

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    pair: "EUR/USD",
    type: "buy",
    entryPrice: "",
    exitPrice: "",
    lotSize: "",
    profit: "",
    status: "open",
    note: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const res = await fetch("/api/trades");
      const data = await res.json();
      setTrades(data.trades || []);
    } catch (error) {
      console.error("Failed to fetch trades:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: formData.pair,
          type: formData.type,
          entryPrice: Number(formData.entryPrice),
          exitPrice: formData.exitPrice
            ? Number(formData.exitPrice)
            : undefined,
          lotSize: Number(formData.lotSize),
          profit: formData.profit ? Number(formData.profit) : undefined,
          status: formData.status,
          note: formData.note || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message);
        return;
      }

      setShowForm(false);
      setFormData({
        pair: "EUR/USD",
        type: "buy",
        entryPrice: "",
        exitPrice: "",
        lotSize: "",
        profit: "",
        status: "open",
        note: "",
      });
      fetchTrades();
    } catch (error) {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trade?")) return;
    try {
      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      if (res.ok) setTrades(trades.filter((t) => t._id !== id));
    } catch (error) {
      console.error("Failed to delete trade:", error);
    }
  };

  const filteredTrades = trades.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  const totalProfit = trades
    .filter((t) => t.status === "closed")
    .reduce((sum, t) => sum + (t.profit || 0), 0);

  const winRate = (() => {
    const closed = trades.filter((t) => t.status === "closed");
    if (closed.length === 0) return 0;
    const wins = closed.filter((t) => (t.profit || 0) > 0);
    return Math.round((wins.length / closed.length) * 100);
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade Journal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track and review all your trades
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-400 text-gray-950 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-300 transition"
        >
          {showForm ? "Cancel" : "+ Log Trade"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Trades", value: trades.length, color: "text-white" },
          {
            label: "Open",
            value: trades.filter((t) => t.status === "open").length,
            color: "text-blue-400",
          },
          {
            label: "Total P&L",
            value: `${totalProfit >= 0 ? "+" : ""}$${totalProfit.toFixed(2)}`,
            color: totalProfit >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            label: "Win Rate",
            value: `${winRate}%`,
            color: winRate >= 50 ? "text-green-400" : "text-red-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          >
            <p className="text-gray-500 text-xs mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Log Trade Form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Log New Trade</h2>

          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
              {formError}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Currency Pair
              </label>
              <select
                name="pair"
                value={formData.pair}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
              >
                {PAIRS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
              >
                <option value="buy">Buy (Long)</option>
                <option value="sell">Sell (Short)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Entry Price
              </label>
              <input
                type="number"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleChange}
                required
                step="0.00001"
                placeholder="e.g. 1.08450"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Exit Price (optional)
              </label>
              <input
                type="number"
                name="exitPrice"
                value={formData.exitPrice}
                onChange={handleChange}
                step="0.00001"
                placeholder="e.g. 1.09200"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Lot Size
              </label>
              <input
                type="number"
                name="lotSize"
                value={formData.lotSize}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="e.g. 0.10"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Profit/Loss (optional)
              </label>
              <input
                type="number"
                name="profit"
                value={formData.profit}
                onChange={handleChange}
                step="0.01"
                placeholder="e.g. 45.50 or -23.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="e.g. Breakout trade on H4"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-green-400 text-gray-950 py-3 rounded-xl text-sm font-bold hover:bg-green-300 transition disabled:opacity-50"
              >
                {formLoading ? "Saving..." : "Save Trade"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "open", "closed"].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition ${
              statusFilter === f
                ? "bg-green-400 text-gray-950"
                : "bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Trades List */}
      {loading ? (
        <p className="text-gray-600 text-center py-10">Loading trades...</p>
      ) : filteredTrades.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
          <p className="text-gray-600">No trades found</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-green-400 text-sm hover:underline mt-2 inline-block"
          >
            Log your first trade
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrades.map((trade) => (
            <div
              key={trade._id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">{trade.pair}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      trade.type === "buy"
                        ? "bg-green-400/10 text-green-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {trade.type.toUpperCase()}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      trade.status === "open"
                        ? "bg-blue-400/10 text-blue-400"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {trade.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Entry: {trade.entryPrice}</span>
                  {trade.exitPrice && <span>Exit: {trade.exitPrice}</span>}
                  <span>Lot: {trade.lotSize}</span>
                  <span>{new Date(trade.openedAt).toLocaleDateString()}</span>
                </div>
                {trade.note && (
                  <p className="text-xs text-gray-600 mt-1 italic">
                    {trade.note}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {trade.profit !== undefined && (
                  <span
                    className={`text-sm font-bold ${
                      trade.profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(2)}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(trade._id)}
                  className="text-xs bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
