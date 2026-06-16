import { NextResponse } from "next/server";
import { getSeason, getGamesBySeason } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/seasons/:year -> standings line + that season's games
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year } = await params;
  const season = Number(year);
  const standings = await getSeason(season);
  if (!standings) {
    return NextResponse.json({ error: "Season not found" }, { status: 404 });
  }
  const games = await getGamesBySeason(season);
  return NextResponse.json({ season: standings, games });
}
