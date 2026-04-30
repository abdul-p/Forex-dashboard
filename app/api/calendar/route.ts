import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `https://nfs.faireconomy.media/ff_calendar_thisweek.json`,
      { next: { revalidate: 3600 } },
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch calendar" },
      { status: 500 },
    );
  }
}
