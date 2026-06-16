import { NextResponse } from "next/server";
import { getPlayers } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/players            -> roster list
// GET /api/players?q=wright   -> name search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const players = await getPlayers(q);
  return NextResponse.json({ count: players.length, players });
}
