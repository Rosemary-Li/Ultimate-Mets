import { NextResponse } from "next/server";
import { getCareerBattingForPlayers } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/compare?ids=596019,624413 -> career batting for those players
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 4);
  const players = await getCareerBattingForPlayers(ids);
  // preserve the requested order
  players.sort((a, b) => ids.indexOf(a.player_id) - ids.indexOf(b.player_id));
  return NextResponse.json({ players });
}
