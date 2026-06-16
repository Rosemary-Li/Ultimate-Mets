import { NextResponse } from "next/server";
import { getRecentGames, getGamesBySeason } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/games            -> most recent final games
// GET /api/games?season=2024 -> all games in a season
// GET /api/games?limit=20
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season");
  const limit = Number(searchParams.get("limit") ?? "10");

  const games = season
    ? await getGamesBySeason(Number(season))
    : await getRecentGames(Number.isFinite(limit) ? limit : 10);

  return NextResponse.json({ count: games.length, games });
}
