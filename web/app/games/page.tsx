import Link from "next/link";
import { getRecentGames } from "@/lib/db";
import { teamLogo } from "@/lib/images";
import type { Game } from "@/lib/types";

export const dynamic = "force-dynamic";

function metsView(g: Game) {
  const home = g.mets_is_home === 1;
  const metsScore = home ? g.home_score : g.away_score;
  const oppScore = home ? g.away_score : g.home_score;
  const opp = home ? g.away_team_name : g.home_team_name;
  const oppId = home ? g.away_team_id : g.home_team_id;
  const won = metsScore != null && oppScore != null && metsScore > oppScore;
  return { home, metsScore, oppScore, opp, oppId, won };
}

export default async function GamesIndexPage() {
  const games = await getRecentGames(40);

  return (
    <div className="ga-wrap">
      <h1 className="ga-page-title">Games</h1>
      <p className="ga-page-sub">
        Most recent games — box scores from MLB, updated daily.
      </p>

      {games.length === 0 ? (
        <div className="ga-empty">
          No games yet. Run ingest_games.py + ingest_boxscores.py to populate.
        </div>
      ) : (
        <div className="ga-list">
          {games.map((g) => {
            const v = metsView(g);
            return (
              <Link key={g.game_pk} href={`/games/${g.game_pk}`} className="ga-row">
                <span className="ga-date">{g.official_date}</span>
                <span className={`ga-res ${v.won ? "w" : "l"}`}>
                  {v.won ? "W" : "L"}
                </span>
                <span className="ga-match">
                  <span className="ga-vs">{v.home ? "vs" : "@"}</span>
                  {v.oppId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="ga-logo" src={teamLogo(v.oppId)} alt="" />
                  )}
                  {v.opp}
                </span>
                <span className="ga-score">
                  {v.metsScore}–{v.oppScore}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
