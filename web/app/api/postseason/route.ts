import { NextResponse } from "next/server";
import { getPostseasonSeries } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/postseason -> all postseason series, newest first
export async function GET() {
  const series = await getPostseasonSeries();
  return NextResponse.json({ count: series.length, series });
}
