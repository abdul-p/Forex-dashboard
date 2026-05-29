import { Edit2, Settings, XCircle } from "lucide-react";

export default function OpenPositionsPanel() {
  const positions = [
    {
      id: "pos-1",
      symbol: "EUR/USD",
      type: "Buy",
      lot: "0.10",
      entry: "1.08201",
      current: "1.08724",
      sl: "1.08200",
      tp: "1.09500",
      pnl: "+52.30",
      pips: "+52.3",
      swap: "-1.20",
    },
    {
      id: "pos-2",
      symbol: "GBP/USD",
      type: "Sell",
      lot: "0.20",
      entry: "1.27045",
      current: "1.26530",
      sl: "1.27500",
      tp: "1.26000",
      pnl: "+103.00",
      pips: "+51.5",
      swap: "-2.10",
    },
    {
      id: "pos-3",
      symbol: "USD/JPY",
      type: "Buy",
      lot: "0.10",
      entry: "156.234",
      current: "157.812",
      sl: "155.800",
      tp: "159.000",
      pnl: "+100.80",
      pips: "+157.8",
      swap: "-1.05",
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#07101b]">
      <div className="flex h-9 items-center border-b border-slate-800 px-3 text-xs">
        <Tab active>Open Positions (3)</Tab>
        <Tab>Pending Orders (2)</Tab>
        <Tab>Trade History</Tab>
        <Tab>Order History</Tab>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#07101b] text-slate-400">
            <tr>
              {["Symbol", "Type", "Lot Size", "Entry Price", "Current Price", "Stop Loss", "Take Profit", "P&L (USD)", "Pips", "Swap", "Actions"].map((heading) => (
                <th key={heading} className="border-b border-slate-800 px-2 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => (
              <tr key={pos.id} className="border-b border-slate-800/70 text-slate-100 hover:bg-slate-800/30">
                <td className="px-2 py-3 font-semibold">{pos.symbol}</td>
                <td className={`px-2 py-3 ${pos.type === "Buy" ? "text-blue-400" : "text-red-400"}`}>{pos.type}</td>
                <td className="px-2 py-3 font-mono">{pos.lot}</td>
                <td className="px-2 py-3 font-mono">{pos.entry}</td>
                <td className="px-2 py-3 font-mono">{pos.current}</td>
                <td className="px-2 py-3 font-mono">{pos.sl}</td>
                <td className="px-2 py-3 font-mono">{pos.tp}</td>
                <td className="px-2 py-3 font-mono text-emerald-400">{pos.pnl}</td>
                <td className="px-2 py-3 font-mono text-emerald-400">{pos.pips}</td>
                <td className="px-2 py-3 font-mono text-red-400">{pos.swap}</td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <button type="button" title="Modify Position" className="text-slate-300 hover:text-white">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" title="Close Position" className="text-red-500 hover:text-red-300">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid h-16 shrink-0 grid-cols-[repeat(7,minmax(0,1fr))_auto] items-center gap-4 border-t border-slate-800 px-4 text-xs">
        <Summary label="Total P&L" value="+256.10 USD" tone="text-emerald-400" />
        <Summary label="Total Pips" value="+261.6" tone="text-emerald-400" />
        <Summary label="Account Equity" value="$25,430.68" />
        <Summary label="Margin Used" value="$642.35" />
        <Summary label="Free Margin" value="$24,788.33" />
        <Summary label="Margin Level" value="3,961.02%" tone="text-emerald-400" />
        <Summary label="Auto Close %" value="50%" />
        <Settings className="h-4 w-4 text-slate-300" />
      </div>
    </div>
  );
}

function Tab({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`mr-6 flex h-full items-center border-b-2 text-xs ${
        active ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Summary({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="mb-1 text-slate-400">{label}</p>
      <p className={`font-mono text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
