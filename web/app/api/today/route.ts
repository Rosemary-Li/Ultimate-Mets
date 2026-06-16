import { NextResponse } from "next/server";
import { getTodayEditorial, getGameAnniversaries, getTrending } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/today?month=6&day=16 (defaults to today) -> editorial + game anniversaries
// GET /api/today?trending=1 -> the trending rail
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("trending")) {
    return NextResponse.json({ trending: await getTrending() });
  }
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const day = Number(searchParams.get("day") ?? now.getDate());
  const [editorial, anniversaries] = await Promise.all([
    getTodayEditorial(month, day),
    getGameAnniversaries(month, day),
  ]);
  return NextResponse.json({ month, day, editorial, anniversaries });
}
