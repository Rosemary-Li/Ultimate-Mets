import { NextResponse } from "next/server";
import { getGame } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/games/:gamePk -> a single game by its MLB game_pk
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gamePk: string }> },
) {
  const { gamePk } = await params;
  const game = await getGame(Number(gamePk));
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  return NextResponse.json({ game });
}
