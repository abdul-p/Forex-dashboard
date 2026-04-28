import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `https://newsdata.io/api/1/news?apikey=${process.env.NEWSDATA_API_KEY}&q=forex+trading&language=en&category=business`,
      { next: { revalidate: 1800 } },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch news" },
      { status: 500 },
    );
  }
}
