import { NextResponse } from "next/server";
import { getMedia } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/media?type=video&season=2024
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? undefined;
  const season = searchParams.get("season");
  const items = await getMedia({
    type,
    season: season ? Number(season) : undefined,
  });
  return NextResponse.json({ count: items.length, items });
}
