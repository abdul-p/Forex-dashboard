import { Edit2, XCircle } from "lucide-react";

export default function OpenPositionsPanel() {
  const positions = [
    {
      id: "pos-1",
      pair: "EUR/USD",
      type: "BUY",
      size: "0.50",
      entry: "1.08200",
      current: "1.08724",
      sl: "1.07800",
      tp: "1.09500",
      pnl: 84.50,
    },
    {
      id: "pos-2",
      pair: "GBP/JPY",
      type: "SELL",
      size: "0.10",
      entry: "191.250",
      current: "191.100",
      sl: "191.750",
      tp: "190.000",
      pnl: 12.30,
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-800 bg-gray-950/60 overflow-hidden">
      <div className="flex items-center gap-4 border-b border-gray-800 bg-gray-900/30 px-4 py-2 text-xs font-medium text-gray-400">
        <button className="text-white border-b-2 border-emerald-500 pb-1 -mb-[9px]">
          Open Positions (2)
        </button>
        <button className="hover:text-gray-300 pb-1 -mb-[9px]">
          Pending Orders (0)
        </button>
        <button className="hover:text-gray-300 pb-1 -mb-[9px]">
          Trade History
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-gray-950/90 text-gray-500 backdrop-blur-sm z-10 shadow-sm">
            <tr>
              <th className="px-4 py-2 font-medium">Pair</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Entry</th>
              <th className="px-4 py-2 font-medium">Current</th>
              <th className="px-4 py-2 font-medium">S/L</th>
              <th className="px-4 py-2 font-medium">T/P</th>
              <th className="px-4 py-2 font-medium text-right">PnL</th>
              <th className="px-4 py-2 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {positions.map((pos) => (
              <tr key={pos.id} className="hover:bg-gray-900/30 transition-colors group">
                <td className="px-4 py-2 font-semibold text-gray-200">
                  {pos.pair}
                </td>
                <td className="px-4 py-2 font-bold">
                  <span className={pos.type === "BUY" ? "text-emerald-400" : "text-red-400"}>
                    {pos.type}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-gray-300">{pos.size}</td>
                <td className="px-4 py-2 font-mono text-gray-400">{pos.entry}</td>
                <td className="px-4 py-2 font-mono text-gray-200">{pos.current}</td>
                <td className="px-4 py-2 font-mono text-gray-400">{pos.sl}</td>
                <td className="px-4 py-2 font-mono text-gray-400">{pos.tp}</td>
                <td className="px-4 py-2 font-mono text-right font-bold">
                  <span className={pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {pos.pnl >= 0 ? "+" : "-"}${Math.abs(pos.pnl).toFixed(2)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button title="Modify Position" className="text-gray-400 hover:text-emerald-400">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button title="Close Position" className="text-gray-400 hover:text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
