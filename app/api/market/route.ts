import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/twelvedata";

export async function GET() {
  try {
    const data = await getQuotes();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch market data" },
      { status: 500 },
    );
  }
}
