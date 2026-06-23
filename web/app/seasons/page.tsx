import Link from "next/link";
import { getSeasons, getFranchiseSummary, getPostseasonSeries } from "@/lib/db";
import type { PostseasonSeries } from "@/lib/types";
import ChartView from "@/components/ChartView";
import ExportPanel from "@/components/ExportPanel";

export const dynamic = "force-dynamic";

const SHORT: Record<string, string> = {
  F: "WC",
  D: "NLDS",
  L: "NLCS",
  W: "WS",
};

function ordinal(rank: string | null): string {
  if (!rank) return "—";
  const n = Number(rank);
  if (!Number.isFinite(n)) return rank;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function pct(v: number): string {
  return v.toFixed(3).replace(/^0/, "");
}

// Pythagorean expected win %: R^1.83 / (R^1.83 + RA^1.83)
function pyth(rs: number | null, ra: number | null): string {
  if (!rs || !ra) return "—";
  const e = 1.83;
  return pct(Math.pow(rs, e) / (Math.pow(rs, e) + Math.pow(ra, e)));
}

function playoffLabel(series: PostseasonSeries[]): string {
  if (series.length === 0) return "";
  const ws = series.find((s) => s.game_type === "W");
  if (ws) return ws.mets_wins > ws.mets_losses ? "Won WS" : "Lost WS";
  const last = series[series.length - 1];
  return `Lost ${SHORT[last.game_type] ?? "PS"}`;
}

export default async function SeasonsIndexPage() {
  const [seasons, fran, allSeries] = await Promise.all([
    getSeasons(),
    getFranchiseSummary(),
    getPostseasonSeries(),
  ]);

  // season -> postseason result label
  const psBySeason = new Map<number, PostseasonSeries[]>();
  for (const s of allSeries) {
    const arr = psBySeason.get(s.season) ?? [];
    arr.push(s);
    psBySeason.set(s.season, arr);
  }
  const labelFor = (yr: number) => playoffLabel(psBySeason.get(yr) ?? []);

  // bar color by achievement: WS champ = gold, other postseason = orange,
  // regular season = blue.
  const BAR_BLUE = "#002D72";
  const BAR_ORANGE = "#FF5910";
  const BAR_GOLD = "#F59E0B";
  const colorFor = (yr: number) => {
    const ser = psBySeason.get(yr) ?? [];
    if (ser.length === 0) return BAR_BLUE;
    const ws = ser.find((s) => s.game_type === "W");
    if (ws && ws.mets_wins > ws.mets_losses) return BAR_GOLD;
    return BAR_ORANGE;
  };

  const chronological = [...seasons].reverse();
  const currentYear = new Date().getFullYear();

  const franW = Number(fran?.wins ?? 0);
  const franL = Number(fran?.losses ?? 0);
  const franRecord =
    franW || franL
      ? `${franW}–${franL} (${pct(franW / (franW + franL))})`
      : "—";

  return (
    <div className="se-wrap">
      <h1 className="se-page-title">New York Mets — Team History</h1>
      <p className="se-page-sub">
        Year-by-year record, finish, and postseason path — from the MLB standings,
        {fran?.first_season ? ` ${fran.first_season}–${fran.last_season}.` : "."}
      </p>

      <ExportPanel
        dataset="seasons"
        minYear={fran?.first_season ?? 1962}
        maxYear={fran?.last_season ?? 2026}
      />

      {fran && (
        <div className="se-fran">
          <div className="se-fran-stat">
            <div className="num">{seasons.length}</div>
            <div className="lbl">Seasons</div>
          </div>
          <div className="se-fran-stat">
            <div className="num">{franRecord}</div>
            <div className="lbl">All-time record</div>
          </div>
          <div className="se-fran-stat">
            <div className="num">{fran.appearances}</div>
            <div className="lbl">Playoff appearances</div>
          </div>
          <div className="se-fran-stat">
            <div className="num">{fran.pennants}</div>
            <div className="lbl">NL Pennants</div>
          </div>
          <div className="se-fran-stat">
            <div className="num">{fran.ws_titles}</div>
            <div className="lbl">World Championships</div>
          </div>
        </div>
      )}

      {seasons.length === 0 ? (
        <div className="se-empty">
          No seasons yet. Run ingest_standings.py to populate this list.
        </div>
      ) : (
        <>
          <div className="se-chart-card">
            <div className="se-chart-head">
              <h2>Wins by Season</h2>
              <div className="se-legend">
                <span><i className="sw blue" /> Season</span>
                <span><i className="sw orange" /> Postseason</span>
                <span><i className="sw gold" /> WS Champions</span>
                <span><i className="sw line" /> .500 (81 W)</span>
              </div>
            </div>
            <ChartView
              type="bar"
              height={220}
              labels={chronological.map((s) => s.season)}
              datasets={[
                {
                  label: "Wins",
                  data: chronological.map((s) => s.wins),
                  colors: chronological.map((s) => colorFor(s.season)),
                },
              ]}
              baseline={{ value: 81, label: ".500" }}
            />
          </div>
          <div className="se-table-wrap">
            <table className="se-table">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>W</th>
                  <th>L</th>
                  <th>W-L%</th>
                  <th>Finish</th>
                  <th>GB</th>
                  <th>Playoffs</th>
                  <th>R</th>
                  <th>RA</th>
                  <th>pythW-L%</th>
                  <th>Home Att.</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.season}>
                    <td>
                      <Link href={`/seasons/${s.season}`} className="se-yr">
                        {s.season}
                      </Link>
                      {s.season === currentYear && (
                        <span className="se-inprog" title="Season in progress">
                          {" "}*
                        </span>
                      )}
                    </td>
                    <td>{s.wins ?? "—"}</td>
                    <td>{s.losses ?? "—"}</td>
                    <td>{s.win_pct ?? "—"}</td>
                    <td>{ordinal(s.division_rank ?? s.league_rank)}</td>
                    <td>{s.games_back ?? "—"}</td>
                    <td className="se-po">{labelFor(s.season)}</td>
                    <td>{s.runs_scored ?? "—"}</td>
                    <td>{s.runs_allowed ?? "—"}</td>
                    <td>{pyth(s.runs_scored, s.runs_allowed)}</td>
                    <td>
                      {s.home_attendance
                        ? Number(s.home_attendance).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {seasons.some((s) => s.season === currentYear) && (
            <p className="se-foot">* {currentYear} season in progress — record &amp; attendance are partial.</p>
          )}
        </>
      )}
    </div>
  );
}
