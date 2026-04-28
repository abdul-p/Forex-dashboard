import { NextRequest, NextResponse } from "next/server";
import { getTimeSeries } from "@/lib/twelvedata";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "EUR/USD";
    const interval = searchParams.get("interval") || "1h";

    const data = await getTimeSeries(symbol, interval);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch chart data" },
      { status: 500 },
    );
  }
}
