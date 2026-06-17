import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeason, getGamesBySeason } from "@/lib/db";
import type { Game } from "@/lib/types";
import Discussion from "@/components/Discussion";

export const dynamic = "force-dynamic";

function metsView(g: Game) {
  const home = g.mets_is_home === 1;
  const metsScore = home ? g.home_score : g.away_score;
  const oppScore = home ? g.away_score : g.home_score;
  const opp = home ? g.away_team_name : g.home_team_name;
  const won =
    metsScore != null && oppScore != null && metsScore > oppScore;
  return { home, metsScore, oppScore, opp, won };
}

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const season = Number(year);
  const s = await getSeason(season);
  if (!s) notFound();

  const games = await getGamesBySeason(season);
  // Regular-season finals only (exclude spring training / exhibition games).
  const finals = games.filter(
    (g) => g.status_code === "F" && g.game_type === "R",
  );

  return (
    <>
      <header className="se-hero">
        <div className="se-hero-inner">
          <div className="se-hero-yr">{s.season} Mets</div>
          <div className="se-strip">
            <div className="se-stat">
              <div className="num">
                {s.wins}–{s.losses}
              </div>
              <div className="lbl">Record</div>
            </div>
            <div className="se-stat">
              <div className="num">{s.win_pct ?? "—"}</div>
              <div className="lbl">Win %</div>
            </div>
            <div className="se-stat">
              <div className="num">{s.division_rank ?? "—"}</div>
              <div className="lbl">Div. finish</div>
            </div>
            <div className="se-stat">
              <div className="num">{s.runs_scored ?? "—"}</div>
              <div className="lbl">Runs scored</div>
            </div>
            <div className="se-stat">
              <div className="num">{s.runs_allowed ?? "—"}</div>
              <div className="lbl">Runs allowed</div>
            </div>
            <div className="se-stat">
              <div className="num">
                {s.run_diff == null
                  ? "—"
                  : s.run_diff >= 0
                    ? `+${s.run_diff}`
                    : s.run_diff}
              </div>
              <div className="lbl">Run diff</div>
            </div>
          </div>
        </div>
      </header>

      <div className="se-wrap">
        <Link href="/seasons" className="se-back">
          ← All seasons
        </Link>

        <h2 className="se-section-title">
          Game log{" "}
          <span style={{ color: "var(--text-light)", fontWeight: 400 }}>
            ({finals.length} games in the database)
          </span>
        </h2>

        {finals.length === 0 ? (
          <p className="se-note">
            No games ingested for {s.season} yet. Run ingest_games.py for this
            season&apos;s date range.
          </p>
        ) : (
          <div className="se-table-wrap se-gamelog">
            <table className="se-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Res</th>
                  <th>Opponent</th>
                  <th>Score</th>
                  <th>Venue</th>
                </tr>
              </thead>
              <tbody>
                {finals.map((g) => {
                  const v = metsView(g);
                  return (
                    <tr key={g.game_pk}>
                      <td>{g.official_date}</td>
                      <td className={`res ${v.won ? "w" : "l"}`}>
                        {v.won ? "W" : "L"}
                      </td>
                      <td style={{ textAlign: "left" }}>
                        {v.home ? "vs " : "@ "}
                        {v.opp}
                      </td>
                      <td>
                        {v.metsScore}–{v.oppScore}
                      </td>
                      <td style={{ textAlign: "left" }}>{g.venue_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="se-note">
          Standings from MLB; game log aggregated from the games table.
        </p>
        <Discussion targetType="season" targetId={season} />
      </div>
    </>
  );
}
