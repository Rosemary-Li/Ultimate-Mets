import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  getGamesByDateRange,
  getPlayersWithStats,
  getAllCareerBatting,
  getAllCareerPitching,
  getSeasons,
} from "@/lib/db";
import { COLUMNS, toCsv, toLabeledRows, type Column } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/export?dataset=games|players|leaders|seasons&format=csv|xlsx&...filters
//   games   : &start=YYYY-MM-DD&end=YYYY-MM-DD
//   leaders : &type=batting|pitching
//   seasons : &from=1962&to=2026
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const dataset = sp.get("dataset") ?? "games";
  const format = sp.get("format") === "xlsx" ? "xlsx" : "csv";

  let rows: Record<string, unknown>[] = [];
  let cols: Column[] = [];
  let name = "mets-export";

  switch (dataset) {
    case "games": {
      const start = sp.get("start") || "1962-01-01";
      const end = sp.get("end") || "2026-12-31";
      rows = (await getGamesByDateRange(start, end)) as unknown as Record<string, unknown>[];
      cols = COLUMNS.games;
      name = `mets-games_${start}_to_${end}`;
      break;
    }
    case "players": {
      rows = (await getPlayersWithStats()) as unknown as Record<string, unknown>[];
      cols = COLUMNS.players;
      name = "mets-players-career";
      break;
    }
    case "leaders": {
      const type = sp.get("type") === "pitching" ? "pitching" : "batting";
      rows =
        type === "pitching" ? await getAllCareerPitching() : await getAllCareerBatting();
      cols = type === "pitching" ? COLUMNS.leadersPitching : COLUMNS.leadersBatting;
      name = `mets-career-${type}-leaders`;
      break;
    }
    case "seasons": {
      const from = Number(sp.get("from")) || 1962;
      const to = Number(sp.get("to")) || 2026;
      const all = (await getSeasons()) as unknown as Record<string, unknown>[];
      rows = all.filter((s) => {
        const yr = Number(s.season);
        return yr >= from && yr <= to;
      });
      cols = COLUMNS.seasons;
      name = `mets-seasons_${from}-${to}`;
      break;
    }
    default:
      return NextResponse.json({ error: "unknown dataset" }, { status: 400 });
  }

  if (format === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(toLabeledRows(rows, cols));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      },
    });
  }

  return new Response(toCsv(rows, cols), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
    },
  });
}
