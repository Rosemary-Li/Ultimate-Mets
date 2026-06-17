import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGame,
  getGameBatting,
  getGamePitching,
  getLinescore,
} from "@/lib/db";
import type { BoxBatting, BoxPitching, LinescoreInning } from "@/lib/types";
import { headshot, teamLogo } from "@/lib/images";

export const dynamic = "force-dynamic";

const num = (n: number | null | undefined) => (n == null ? 0 : n);

// small headshot cell for box-score player names
function PlayerCell({
  id,
  name,
}: {
  id: number;
  name: string | number | null;
}) {
  return (
    <Link href={`/players/${id}`} className="ga-pl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={headshot(id)} alt="" loading="lazy" />
      <span>{name}</span>
    </Link>
  );
}

function Linescore({
  rows,
  away,
  home,
  awayRuns,
  homeRuns,
}: {
  rows: LinescoreInning[];
  away: string;
  home: string;
  awayRuns: number | null;
  homeRuns: number | null;
}) {
  const sum = (side: "away" | "home", key: "hits" | "errors") =>
    rows.reduce((a, r) => a + num(r[`${side}_${key}` as keyof LinescoreInning] as number), 0);
  return (
    <div className="ga-table-wrap">
      <table className="ga-table ga-line">
        <thead>
          <tr>
            <th></th>
            {rows.map((r) => (
              <th key={r.inning_num}>{r.inning_num}</th>
            ))}
            <th className="tot">R</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{away}</td>
            {rows.map((r) => (
              <td key={r.inning_num}>{r.away_runs ?? "-"}</td>
            ))}
            <td className="tot">{awayRuns}</td>
            <td>{sum("away", "hits")}</td>
            <td>{sum("away", "errors")}</td>
          </tr>
          <tr>
            <td>{home}</td>
            {rows.map((r) => (
              <td key={r.inning_num}>{r.home_runs ?? "-"}</td>
            ))}
            <td className="tot">{homeRuns}</td>
            <td>{sum("home", "hits")}</td>
            <td>{sum("home", "errors")}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BattingTable({ team, rows }: { team: string; rows: BoxBatting[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <h3 className="ga-section-title">{team} — Batting</h3>
      <div className="ga-table-wrap">
        <table className="ga-table ga-box">
          <thead>
            <tr>
              <th>Batter</th>
              <th>Pos</th>
              <th>AB</th>
              <th>R</th>
              <th>H</th>
              <th>2B</th>
              <th>HR</th>
              <th>RBI</th>
              <th>BB</th>
              <th>SO</th>
              <th>SB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.player_id}>
                <td>
                  <PlayerCell id={b.player_id} name={b.full_name ?? b.player_id} />
                </td>
                <td>{b.position ?? "—"}</td>
                <td>{num(b.at_bats)}</td>
                <td>{num(b.runs)}</td>
                <td>{num(b.hits)}</td>
                <td>{num(b.doubles)}</td>
                <td>{num(b.home_runs)}</td>
                <td>{num(b.rbi)}</td>
                <td>{num(b.walks)}</td>
                <td>{num(b.strike_outs)}</td>
                <td>{num(b.stolen_bases)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PitchingTable({ team, rows }: { team: string; rows: BoxPitching[] }) {
  if (rows.length === 0) return null;
  return (
    <>
      <h3 className="ga-section-title">{team} — Pitching</h3>
      <div className="ga-table-wrap">
        <table className="ga-table ga-box">
          <thead>
            <tr>
              <th>Pitcher</th>
              <th>IP</th>
              <th>H</th>
              <th>R</th>
              <th>ER</th>
              <th>BB</th>
              <th>SO</th>
              <th>HR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.player_id}>
                <td>
                  <PlayerCell id={p.player_id} name={p.full_name ?? p.player_id} />
                </td>
                <td>{p.innings_pitched ?? "—"}</td>
                <td>{num(p.hits)}</td>
                <td>{num(p.runs)}</td>
                <td>{num(p.earned_runs)}</td>
                <td>{num(p.walks)}</td>
                <td>{num(p.strike_outs)}</td>
                <td>{num(p.home_runs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gamePk: string }>;
}) {
  const { gamePk } = await params;
  const id = Number(gamePk);
  const game = await getGame(id);
  if (!game) notFound();

  const [linescore, batting, pitching] = await Promise.all([
    getLinescore(id),
    getGameBatting(id),
    getGamePitching(id),
  ]);

  const awayName = game.away_team_name ?? "Away";
  const homeName = game.home_team_name ?? "Home";
  const awayWon =
    game.away_score != null &&
    game.home_score != null &&
    game.away_score > game.home_score;

  const byTeam = <T extends { team_id: number | null }>(rows: T[], teamId: number | null) =>
    rows.filter((r) => r.team_id === teamId);

  return (
    <>
      <header className="ga-hero">
        <div className="ga-hero-inner">
          <div className="ga-hero-meta">
            {game.official_date} · {game.venue_name}
            {game.game_type !== "R" ? " · Postseason" : ""}
          </div>
          <div className="ga-score-line">
            <span className={`ga-team ${awayWon ? "win" : ""}`}>
              {game.away_team_id && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ga-team-logo" src={teamLogo(game.away_team_id)} alt="" />
              )}
              {awayName}
              <span className="rs">{game.away_score}</span>
            </span>
            <span className="ga-at">@</span>
            <span className={`ga-team ${!awayWon ? "win" : ""}`}>
              {game.home_team_id && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ga-team-logo" src={teamLogo(game.home_team_id)} alt="" />
              )}
              {homeName}
              <span className="rs">{game.home_score}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="ga-wrap">
        <Link href="/games" className="ga-back">
          ← All games
        </Link>

        {linescore.length > 0 && (
          <Linescore
            rows={linescore}
            away={awayName}
            home={homeName}
            awayRuns={game.away_score}
            homeRuns={game.home_score}
          />
        )}

        {batting.length === 0 && pitching.length === 0 ? (
          <p className="ga-note">
            No box-score data ingested for this game yet. Run ingest_boxscores.py.
          </p>
        ) : (
          <>
            <BattingTable team={awayName} rows={byTeam(batting, game.away_team_id)} />
            <BattingTable team={homeName} rows={byTeam(batting, game.home_team_id)} />
            <PitchingTable team={awayName} rows={byTeam(pitching, game.away_team_id)} />
            <PitchingTable team={homeName} rows={byTeam(pitching, game.home_team_id)} />
          </>
        )}

        <p className="ga-note">
          Box score and linescore from MLB game data.
        </p>
      </div>
    </>
  );
}
