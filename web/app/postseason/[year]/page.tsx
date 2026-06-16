import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostseasonSeries, getPostseasonGames } from "@/lib/db";
import type { Game } from "@/lib/types";

export const dynamic = "force-dynamic";

const SHORT: Record<string, string> = {
  F: "Wild Card Series",
  D: "NL Division Series",
  L: "NL Championship Series",
  W: "World Series",
};

function metsView(g: Game) {
  const home = g.mets_is_home === 1;
  const metsScore = home ? g.home_score : g.away_score;
  const oppScore = home ? g.away_score : g.home_score;
  const opp = home ? g.away_team_name : g.home_team_name;
  const won = metsScore != null && oppScore != null && metsScore > oppScore;
  return { home, metsScore, oppScore, opp, won };
}

export default async function PostseasonDetailPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const season = Number(year);
  const series = await getPostseasonSeries(season);
  if (series.length === 0) notFound();

  const games = await getPostseasonGames(season);

  return (
    <div className="ps-wrap">
      <Link href="/postseason" className="ps-back">
        ← All postseasons
      </Link>
      <h1 className="ps-page-title">{season} Postseason</h1>

      {series.map((s) => {
        const roundGames = games.filter((g) => g.game_type === s.game_type);
        const won = s.mets_wins > s.mets_losses;
        return (
          <div key={s.game_type}>
            <h2 className="ps-series-title">
              {s.series_description ?? SHORT[s.game_type]} —{" "}
              <span style={{ color: won ? "var(--c-games)" : "#dc2626" }}>
                {won ? "won" : "lost"} {s.mets_wins}–{s.mets_losses}
              </span>
            </h2>
            {roundGames.map((g) => {
              const v = metsView(g);
              return (
                <Link key={g.game_pk} href={`/games/${g.game_pk}`} className="ps-game">
                  <span className="ps-gnum">Game {g.series_game_number}</span>
                  <span className={`ps-res ${v.won ? "w" : "l"}`}>
                    {v.won ? "W" : "L"}
                  </span>
                  <span className="ps-match">
                    {v.home ? "vs " : "@ "}
                    {v.opp}
                  </span>
                  <span className="ps-score">
                    {v.metsScore}–{v.oppScore}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
