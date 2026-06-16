import { NextResponse } from "next/server";
import { getSeasons } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/seasons -> all Mets seasons, newest first
export async function GET() {
  const seasons = await getSeasons();
  return NextResponse.json({ count: seasons.length, seasons });
}
