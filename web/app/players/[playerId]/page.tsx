import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlayer,
  getPlayerSeasonBatting,
  getPlayerSeasonPitching,
} from "@/lib/db";
import type { SeasonBatting, SeasonPitching } from "@/lib/types";

export const dynamic = "force-dynamic";

const BAT_COLS: { key: keyof SeasonBatting; label: string }[] = [
  { key: "season", label: "Season" },
  { key: "games", label: "G" },
  { key: "at_bats", label: "AB" },
  { key: "runs", label: "R" },
  { key: "hits", label: "H" },
  { key: "doubles", label: "2B" },
  { key: "triples", label: "3B" },
  { key: "home_runs", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "walks", label: "BB" },
  { key: "strike_outs", label: "SO" },
  { key: "stolen_bases", label: "SB" },
  { key: "avg", label: "AVG" },
  { key: "obp", label: "OBP" },
  { key: "slg", label: "SLG" },
];

const PIT_COLS: { key: keyof SeasonPitching; label: string }[] = [
  { key: "season", label: "Season" },
  { key: "games", label: "G" },
  { key: "games_started", label: "GS" },
  { key: "innings_pitched", label: "IP" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "saves", label: "SV" },
  { key: "hits", label: "H" },
  { key: "runs", label: "R" },
  { key: "earned_runs", label: "ER" },
  { key: "walks", label: "BB" },
  { key: "strike_outs", label: "SO" },
  { key: "era", label: "ERA" },
  { key: "whip", label: "WHIP" },
];

function StatTable<T extends object>({
  cols,
  rows,
}: {
  cols: { key: keyof T; label: string }[];
  rows: T[];
}) {
  return (
    <div className="pl-table-wrap">
      <table className="pl-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={String(c.key)}>{(r[c.key] as React.ReactNode) ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const id = Number(playerId);
  const player = await getPlayer(id);
  if (!player) notFound();

  const [batting, pitching] = await Promise.all([
    getPlayerSeasonBatting(id),
    getPlayerSeasonPitching(id),
  ]);

  const bio = [
    player.primary_position,
    player.bat_side && `Bats: ${player.bat_side}`,
    player.pitch_hand && `Throws: ${player.pitch_hand}`,
    player.birth_date && `Born ${player.birth_date}`,
    player.mlb_debut_date && `MLB debut ${player.mlb_debut_date}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <>
      <header className="pl-hero">
        <div className="pl-hero-inner">
          {player.primary_number && (
            <div className="pl-hero-num">#{player.primary_number}</div>
          )}
          <div>
            <div className="pl-hero-name">{player.full_name}</div>
            <div className="pl-hero-meta">{bio}</div>
          </div>
        </div>
      </header>

      <div className="pl-wrap">
        <Link href="/players" className="pl-back">
          ← All players
        </Link>

        {batting.length > 0 && (
          <>
            <h2 className="pl-section-title">Batting (by season, as a Met)</h2>
            <StatTable cols={BAT_COLS} rows={batting} />
          </>
        )}

        {pitching.length > 0 && (
          <>
            <h2 className="pl-section-title">Pitching (by season, as a Met)</h2>
            <StatTable cols={PIT_COLS} rows={pitching} />
          </>
        )}

        {batting.length === 0 && pitching.length === 0 && (
          <p className="pl-note">
            No game-level stats ingested for this player yet. Run
            ingest_boxscores.py to populate batting/pitching lines.
          </p>
        )}

        <p className="pl-note">
          Stats are aggregated from per-game boxscore data (Mets games), recomputed
          live from the database.
        </p>
      </div>
    </>
  );
}
