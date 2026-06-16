import { NextResponse } from "next/server";
import {
  getGame,
  getGameBatting,
  getGamePitching,
  getLinescore,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/games/:gamePk -> game + linescore + box-score batting/pitching
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gamePk: string }> },
) {
  const { gamePk } = await params;
  const id = Number(gamePk);
  const game = await getGame(id);
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const [linescore, batting, pitching] = await Promise.all([
    getLinescore(id),
    getGameBatting(id),
    getGamePitching(id),
  ]);
  return NextResponse.json({ game, linescore, batting, pitching });
}
