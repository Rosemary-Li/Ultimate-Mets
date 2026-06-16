import { NextResponse } from "next/server";
import {
  getPlayer,
  getPlayerSeasonBatting,
  getPlayerSeasonPitching,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/players/:playerId -> bio + season-by-season batting & pitching
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await params;
  const id = Number(playerId);
  const player = await getPlayer(id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  const [batting, pitching] = await Promise.all([
    getPlayerSeasonBatting(id),
    getPlayerSeasonPitching(id),
  ]);
  return NextResponse.json({ player, batting, pitching });
}
