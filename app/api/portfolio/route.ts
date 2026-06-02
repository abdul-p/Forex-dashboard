import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Trade, { type ITrade } from "@/models/Trade";
import User from "@/models/User";

const STARTING_BALANCE_FALLBACK = 10000;
const DEFAULT_LEVERAGE = 30;
const CONTRACT_SIZE = 100000;

const round = (value: number, decimals = 2) =>
  Number.isFinite(value) ? parseFloat(value.toFixed(decimals)) : 0;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const getTradeDate = (trade: ITrade) =>
  new Date(trade.closedAt || trade.openedAt || trade.createdAt);

const getCurrentPrice = (trade: ITrade) => {
  if (trade.exitPrice) return trade.exitPrice;

  const directionalMove = trade.type === "buy" ? 0.0024 : -0.0024;
  const profitMove =
    trade.profit && trade.lotSize
      ? trade.profit / (trade.lotSize * CONTRACT_SIZE)
      : directionalMove;

  return trade.type === "buy"
    ? trade.entryPrice + profitMove
    : trade.entryPrice - profitMove;
};

const getFloatingProfit = (trade: ITrade) => {
  if (typeof trade.profit === "number") return trade.profit;

  const currentPrice = getCurrentPrice(trade);
  const direction = trade.type === "buy" ? 1 : -1;

  return (currentPrice - trade.entryPrice) * direction * trade.lotSize * CONTRACT_SIZE;
};

const getDuration = (trade: ITrade) => {
  const start = new Date(trade.openedAt || trade.createdAt).getTime();
  const end = trade.closedAt ? new Date(trade.closedAt).getTime() : Date.now();
  const hours = Math.max(Math.round((end - start) / (1000 * 60 * 60)), 1);

  if (hours < 24) return `${hours}h`;

  return `${Math.round(hours / 24)}d`;
};

const getCurrencyExposure = (openTrades: ITrade[]) => {
  const totals: Record<string, number> = {};
  let totalExposure = 0;

  openTrades.forEach((trade) => {
    const [base, quote] = trade.pair.split("/");
    const notional = Math.abs(trade.entryPrice * trade.lotSize * CONTRACT_SIZE);
    const baseDirection = trade.type === "buy" ? 1 : -1;
    const quoteDirection = trade.type === "buy" ? -1 : 1;

    totals[base] = (totals[base] || 0) + notional * baseDirection;
    totals[quote] = (totals[quote] || 0) + notional * quoteDirection;
    totalExposure += notional * 2;
  });

  return Object.entries(totals)
    .map(([currency, amount]) => ({
      currency,
      amount: round(amount),
      percent: totalExposure > 0 ? round((Math.abs(amount) / totalExposure) * 100, 1) : 0,
      direction: amount >= 0 ? "long" : "short",
    }))
    .sort((first, second) => second.percent - first.percent)
    .slice(0, 6);
};

const getMaxDrawdown = (equityValues: number[]) => {
  let peak = equityValues[0] || 0;
  let maxDrawdown = 0;

  equityValues.forEach((equity) => {
    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDrawdown = Math.min(maxDrawdown, ((equity - peak) / peak) * 100);
    }
  });

  return round(maxDrawdown, 1);
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id).select("-password");
    const trades = await Trade.find({ user: session.user.id }).sort({
      createdAt: 1,
    });

    const balance = user?.balance || STARTING_BALANCE_FALLBACK;
    const closedTrades = trades.filter((trade) => trade.status === "closed");
    const openTrades = trades.filter((trade) => trade.status === "open");
    const winningTrades = closedTrades.filter((trade) => (trade.profit || 0) > 0);
    const losingTrades = closedTrades.filter((trade) => (trade.profit || 0) < 0);

    const totalProfit = closedTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    const grossProfit = winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0));
    const floatingProfit = openTrades.reduce((sum, trade) => sum + getFloatingProfit(trade), 0);
    const equity = balance + floatingProfit;
    const marginUsed = openTrades.reduce(
      (sum, trade) => sum + Math.abs(trade.entryPrice * trade.lotSize * CONTRACT_SIZE) / DEFAULT_LEVERAGE,
      0,
    );
    const freeMargin = equity - marginUsed;
    const marginLevel = marginUsed > 0 ? (equity / marginUsed) * 100 : 0;
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const lossRate = closedTrades.length > 0 ? (losingTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    const largestWinningTrade = Math.max(0, ...closedTrades.map((trade) => trade.profit || 0));
    const largestLosingTrade = Math.min(0, ...closedTrades.map((trade) => trade.profit || 0));
    const currentRisk = balance > 0 ? (openTrades.reduce((sum, trade) => sum + Math.abs(trade.lotSize) * balance * 0.01, 0) / balance) * 100 : 0;
    const averageRiskPerTrade =
      trades.length > 0 ? trades.reduce((sum, trade) => sum + Math.abs(trade.lotSize) * 0.7, 0) / trades.length : 0;

    let runningBalance = balance - totalProfit;
    const equityCurve = [
      {
        date: "Start",
        balance: round(runningBalance),
        equity: round(runningBalance),
        profit: 0,
        event: "Starting capital",
      },
      ...closedTrades.map((trade) => {
        runningBalance += trade.profit || 0;
        return {
          date: formatDate(getTradeDate(trade)),
          balance: round(runningBalance),
          equity: round(runningBalance),
          profit: round(trade.profit || 0),
          event: (trade.profit || 0) >= 0 ? "Winning trade" : "Losing trade",
        };
      }),
    ];

    const maxDrawdown = getMaxDrawdown(equityCurve.map((point) => point.equity));

    const openPositions = openTrades
      .slice()
      .reverse()
      .map((trade) => {
        const currentPrice = getCurrentPrice(trade);
        const profit = getFloatingProfit(trade);
        const stopDistance = trade.type === "buy" ? -0.003 : 0.003;
        const targetDistance = trade.type === "buy" ? 0.006 : -0.006;

        return {
          id: trade._id.toString(),
          pair: trade.pair,
          type: trade.type,
          entry: round(trade.entryPrice, 5),
          current: round(currentPrice, 5),
          profit: round(profit),
          lotSize: trade.lotSize,
          stopLoss: round(trade.entryPrice + stopDistance, 5),
          takeProfit: round(trade.entryPrice + targetDistance, 5),
          duration: getDuration(trade),
        };
      });

    const pairStats: Record<string, { trades: number; profit: number }> = {};
    closedTrades.forEach((trade) => {
      if (!pairStats[trade.pair]) {
        pairStats[trade.pair] = { trades: 0, profit: 0 };
      }
      pairStats[trade.pair].trades += 1;
      pairStats[trade.pair].profit += trade.profit || 0;
    });

    const longCount = openTrades.filter((trade) => trade.type === "buy").length;
    const shortCount = openTrades.filter((trade) => trade.type === "sell").length;
    const openCount = Math.max(openTrades.length, 1);
    const bestPair = Object.entries(pairStats).sort((first, second) => second[1].profit - first[1].profit)[0];
    const recentClosed = closedTrades.slice(-10).reverse();
    const journalEntries = trades
      .filter((trade) => trade.note)
      .slice(-3)
      .reverse()
      .map((trade) => ({
        id: trade._id.toString(),
        pair: trade.pair,
        note: trade.note,
        emotion: (trade.profit || 0) >= 0 ? "Confident" : "Cautious",
        lesson:
          (trade.profit || 0) >= 0
            ? "Repeat the setup only when confirmation is present."
            : "Review entry timing and risk before the next position.",
      }));

    const achievements = [
      {
        label: "100 Trades Completed",
        achieved: trades.length >= 100,
        progress: Math.min(trades.length, 100),
        target: 100,
      },
      {
        label: "10 Consecutive Wins",
        achieved: winningTrades.length >= 10,
        progress: Math.min(winningTrades.length, 10),
        target: 10,
      },
      {
        label: "First $1,000 Profit",
        achieved: totalProfit >= 1000,
        progress: Math.min(Math.max(totalProfit, 0), 1000),
        target: 1000,
      },
      {
        label: "30 Days Profitable",
        achieved: totalProfit > 0 && closedTrades.length >= 30,
        progress: Math.min(totalProfit > 0 ? closedTrades.length : 0, 30),
        target: 30,
      },
    ];

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        70 + (profitFactor >= 1.5 ? 10 : -10) + (winRate >= 50 ? 8 : -8) + (currentRisk <= 3 ? 7 : -10) + (maxDrawdown > -10 ? 5 : -10),
      ),
    );

    return NextResponse.json({
      stats: {
        totalTrades: trades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalProfit: round(totalProfit),
        floatingProfit: round(floatingProfit),
        balance: round(balance),
        equity: round(equity),
        freeMargin: round(freeMargin),
        marginUsed: round(marginUsed),
        marginLevel: round(marginLevel, 1),
        currentRisk: round(currentRisk, 1),
        maxDrawdown,
        averageRiskPerTrade: round(averageRiskPerTrade, 1),
        largestLosingTrade: round(largestLosingTrade),
        largestWinningTrade: round(largestWinningTrade),
        winRate: round(winRate, 1),
        lossRate: round(lossRate, 1),
        avgWin: round(avgWin),
        avgLoss: round(avgLoss),
        profitFactor: round(profitFactor, 2),
        riskRewardRatio: round(riskRewardRatio, 1),
        healthScore: round(healthScore, 0),
      },
      equityCurve,
      openPositions,
      exposure: {
        currencies: getCurrencyExposure(openTrades),
        longPercent: round((longCount / openCount) * 100, 1),
        shortPercent: round((shortCount / openCount) * 100, 1),
      },
      pairStats,
      tradeHistory: recentClosed.map((trade) => ({
        id: trade._id.toString(),
        pair: trade.pair,
        type: trade.type,
        result: round(trade.profit || 0),
        date: formatDate(getTradeDate(trade)),
        strategy: trade.note ? "Journaled" : "Manual",
      })),
      journalEntries,
      achievements,
      insights: [
        bestPair
          ? `${bestPair[0]} is currently your strongest closed-trade pair at $${round(bestPair[1].profit).toLocaleString()}.`
          : "Close more trades to build reliable pair-level performance data.",
        currentRisk > 3
          ? "Current open risk is elevated. Consider reducing position size or tightening stops."
          : "Current risk is within a conservative operating range.",
        openTrades.length >= 4
          ? "You have multiple active positions. Check correlation before adding exposure."
          : "Open position count is manageable for focused trade review.",
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";

    return NextResponse.json({ message }, { status: 500 });
  }
}
