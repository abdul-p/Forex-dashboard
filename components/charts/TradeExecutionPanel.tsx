"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

export default function TradeExecutionPanel() {
  const [lotSize, setLotSize] = useState("0.10");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Trade Execution
        </h3>
      </div>

      <div className="space-y-4">
        {/* Lot Size */}
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase text-gray-500">
            Lot Size
          </label>
          <div className="flex gap-2">
            {["0.01", "0.10", "1.00"].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setLotSize(size)}
                className={`flex-1 rounded border py-1.5 text-xs font-medium transition ${
                  lotSize === size
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                    : "border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700 hover:text-gray-300"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.01"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            className="mt-2 w-full rounded border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* SL & TP */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase text-gray-500">
              Stop Loss
            </label>
            <input
              type="text"
              placeholder="Price or Pips"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full rounded border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-red-500/50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase text-gray-500">
              Take Profit
            </label>
            <input
              type="text"
              placeholder="Price or Pips"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full rounded border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-sm font-mono text-white outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Risk Calculator Info */}
        <div className="rounded-md bg-gray-900/30 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 mb-2 text-gray-400">
            <Calculator className="h-3 w-3" />
            <span className="font-medium">Risk/Reward Profile</span>
          </div>
          <div className="grid grid-cols-2 gap-1 font-mono">
            <div className="text-gray-500">Risk: <span className="text-red-400">2%</span></div>
            <div className="text-gray-500 text-right">Margin: <span className="text-gray-200">$214.00</span></div>
            <div className="text-gray-500">Reward: <span className="text-emerald-400">6%</span></div>
            <div className="text-gray-500 text-right">Ratio: <span className="text-gray-200">1:3</span></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button className="rounded bg-red-500/10 border border-red-500/20 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            SELL
          </button>
          <button className="rounded bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-sm font-bold text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            BUY
          </button>
        </div>
      </div>
    </div>
  );
}
