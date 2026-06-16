import Link from "next/link";
import { getSeasons } from "@/lib/db";

export const dynamic = "force-dynamic";

function ordinal(rank: string | null): string {
  if (!rank) return "—";
  const n = Number(rank);
  if (!Number.isFinite(n)) return rank;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function SeasonsIndexPage() {
  const seasons = await getSeasons();

  return (
    <div className="se-wrap">
      <h1 className="se-page-title">Seasons</h1>
      <p className="se-page-sub">
        Year-by-year record and finish — from the MLB standings, updated daily.
      </p>

      {seasons.length === 0 ? (
        <div className="se-empty">
          No seasons yet. Run ingest_standings.py to populate this list.
        </div>
      ) : (
        <div className="se-table-wrap">
          <table className="se-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>W</th>
                <th>L</th>
                <th>PCT</th>
                <th>GB</th>
                <th>Div. finish</th>
                <th>RS</th>
                <th>RA</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr key={s.season}>
                  <td>
                    <Link href={`/seasons/${s.season}`} className="se-yr">
                      {s.season}
                    </Link>
                  </td>
                  <td>{s.wins ?? "—"}</td>
                  <td>{s.losses ?? "—"}</td>
                  <td>{s.win_pct ?? "—"}</td>
                  <td>{s.games_back ?? "—"}</td>
                  <td>{ordinal(s.division_rank)}</td>
                  <td>{s.runs_scored ?? "—"}</td>
                  <td>{s.runs_allowed ?? "—"}</td>
                  <td
                    className={
                      s.run_diff == null
                        ? ""
                        : s.run_diff >= 0
                          ? "se-pos"
                          : "se-neg"
                    }
                  >
                    {s.run_diff == null
                      ? "—"
                      : s.run_diff >= 0
                        ? `+${s.run_diff}`
                        : s.run_diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
