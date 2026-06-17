import { NextResponse } from "next/server";
import {
  getCareerBattingForPlayers,
  getCareerPitchingForPlayers,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/compare?ids=596019,624413&type=batting|pitching
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "pitching" ? "pitching" : "batting";
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 4);

  const players =
    type === "pitching"
      ? await getCareerPitchingForPlayers(ids)
      : await getCareerBattingForPlayers(ids);

  players.sort(
    (a, b) => ids.indexOf(a.player_id) - ids.indexOf(b.player_id),
  );
  return NextResponse.json({ type, players });
}
