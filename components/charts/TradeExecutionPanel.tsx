"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

interface TradeExecutionPanelProps {
  buyPrice: string;
  sellPrice: string;
}

export default function TradeExecutionPanel({ buyPrice, sellPrice }: TradeExecutionPanelProps) {
  const [lotSize, setLotSize] = useState("0.10");
  const [risk, setRisk] = useState("2.00");
  const [stopLoss, setStopLoss] = useState("1.08200");
  const [takeProfit, setTakeProfit] = useState("1.09500");
  const [orderType, setOrderType] = useState("Market");

  return (
    <section className="rounded-md border border-slate-800 bg-[#0a1421] p-3 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
      <h3 className="mb-3 text-sm font-semibold text-white">Trade Execution</h3>

      <div className="mb-2 grid grid-cols-3 gap-2 rounded-md bg-[#07101b] p-1">
        {["Market", "Limit", "Stop"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setOrderType(type)}
            className={`h-7 rounded text-xs ${orderType === type ? "bg-blue-600/70 text-white" : "text-slate-400"}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <button type="button" className="rounded bg-emerald-500 px-3 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(16,185,129,0.22)]">
          Buy
          <span className="block font-mono">{buyPrice}</span>
        </button>
        <button type="button" className="rounded bg-red-500 px-3 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(239,68,68,0.2)]">
          Sell
          <span className="block font-mono">{sellPrice}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Lot Size" value={lotSize} onChange={setLotSize} />
        <Field label="Risk" value={risk} onChange={setRisk} suffix="%" />
        <Field label="Stop Loss" value={stopLoss} onChange={setStopLoss} />
        <Field label="Take Profit" value={takeProfit} onChange={setTakeProfit} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="text-slate-400">Margin Required</p>
          <p className="mt-1 font-mono text-white">$214.35</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400">Potential Profit</p>
          <p className="mt-1 font-mono font-semibold text-emerald-400">+$78.60</p>
        </div>
      </div>

      <button type="button" className="mt-4 h-10 w-full rounded bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
        Place Buy Order
      </button>
    </section>
  );
}

function Field({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: string;
  suffix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      <span className="flex h-8 overflow-hidden rounded border border-slate-700 bg-[#07101b]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 font-mono text-xs text-white outline-none"
        />
        {suffix && <span className="flex items-center border-l border-slate-700 px-2 text-xs text-slate-300">{suffix}</span>}
        <button type="button" className="flex w-8 items-center justify-center border-l border-slate-700 text-slate-400" aria-label={`Decrease ${label}`}>
          <Minus className="h-3 w-3" />
        </button>
        <button type="button" className="flex w-8 items-center justify-center border-l border-slate-700 text-slate-400" aria-label={`Increase ${label}`}>
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </label>
  );
}
