import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Trade from "@/models/Trade";
import User from "@/models/User";

export async function GET(req: NextRequest) {
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

    const closedTrades = trades.filter((t) => t.status === "closed");
    const openTrades = trades.filter((t) => t.status === "open");

    const totalProfit = closedTrades.reduce(
      (sum, t) => sum + (t.profit || 0),
      0,
    );
    const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0);
    const losingTrades = closedTrades.filter((t) => (t.profit || 0) < 0);
    const winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;

    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0) /
          winningTrades.length
        : 0;

    const avgLoss =
      losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0) /
          losingTrades.length
        : 0;

    const profitFactor =
      avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? 999 : 0;

    // Build equity curve
    let runningBalance = user?.balance || 10000;
    const equityCurve = closedTrades.map((trade) => {
      runningBalance += trade.profit || 0;
      return {
        date: new Date(trade.closedAt || trade.createdAt).toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric" },
        ),
        equity: parseFloat(runningBalance.toFixed(2)),
        profit: trade.profit || 0,
      };
    });

    // Pair breakdown
    const pairStats: Record<string, { trades: number; profit: number }> = {};
    closedTrades.forEach((trade) => {
      if (!pairStats[trade.pair]) {
        pairStats[trade.pair] = { trades: 0, profit: 0 };
      }
      pairStats[trade.pair].trades += 1;
      pairStats[trade.pair].profit += trade.profit || 0;
    });

    return NextResponse.json({
      stats: {
        totalTrades: trades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        balance: user?.balance || 0,
      },
      equityCurve,
      pairStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
