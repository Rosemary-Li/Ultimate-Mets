import { NextResponse } from "next/server";
import { getLeaders, type LeaderScope, type LeaderType } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/leaders?scope=career|season&type=batting|pitching&stat=home_runs&season=2025&limit=25
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") ?? "career") as LeaderScope;
  const type = (searchParams.get("type") ?? "batting") as LeaderType;
  const stat = searchParams.get("stat") ?? "home_runs";
  const season = searchParams.get("season");
  const limit = Number(searchParams.get("limit") ?? "25");

  const rows = await getLeaders({
    scope,
    type,
    stat,
    season: season ? Number(season) : undefined,
    limit,
  });
  return NextResponse.json({ scope, type, stat, count: rows.length, leaders: rows });
}
