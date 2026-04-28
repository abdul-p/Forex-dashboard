import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongodb";
import Trade from "@/models/Trade";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const trades = await Trade.find({ user: session.user.id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ trades });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const trade = await Trade.create({
      ...body,
      user: session.user.id,
    });

    return NextResponse.json(
      { message: "Trade logged successfully", trade },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Something went wrong" },
      { status: 500 },
    );
  }
}
