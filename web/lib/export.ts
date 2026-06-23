// Shared CSV builder + column specs for the data-export endpoint (/api/export).
// Each dataset declares an ordered list of {key, header} so the download has
// stable, human-friendly column names regardless of DB column order.

export type Column = { key: string; header: string };

export type Dataset = "games" | "players" | "leaders" | "seasons";

export const COLUMNS: Record<string, Column[]> = {
  games: [
    { key: "official_date", header: "Date" },
    { key: "season", header: "Season" },
    { key: "game_type", header: "Type" },
    { key: "away_team_name", header: "Away" },
    { key: "away_score", header: "Away Score" },
    { key: "home_team_name", header: "Home" },
    { key: "home_score", header: "Home Score" },
    { key: "status", header: "Status" },
    { key: "venue_name", header: "Venue" },
    { key: "mets_is_home", header: "Mets Home" },
    { key: "game_pk", header: "Game ID" },
  ],
  players: [
    { key: "full_name", header: "Player" },
    { key: "primary_number", header: "Number" },
    { key: "primary_position", header: "Position" },
    { key: "position_type", header: "Position Type" },
    { key: "bat_side", header: "Bats" },
    { key: "pitch_hand", header: "Throws" },
    { key: "birth_date", header: "Born" },
    { key: "bat_avg", header: "AVG" },
    { key: "bat_hr", header: "HR" },
    { key: "bat_rbi", header: "RBI" },
    { key: "bat_games", header: "Batting G" },
    { key: "era", header: "ERA" },
    { key: "wins", header: "W" },
    { key: "losses", header: "L" },
    { key: "pit_so", header: "SO" },
    { key: "pit_games", header: "Pitching G" },
    { key: "player_id", header: "Player ID" },
  ],
  leadersBatting: [
    { key: "full_name", header: "Player" },
    { key: "primary_position", header: "Position" },
    { key: "seasons", header: "Seasons" },
    { key: "games", header: "G" },
    { key: "at_bats", header: "AB" },
    { key: "runs", header: "R" },
    { key: "hits", header: "H" },
    { key: "doubles", header: "2B" },
    { key: "triples", header: "3B" },
    { key: "home_runs", header: "HR" },
    { key: "rbi", header: "RBI" },
    { key: "walks", header: "BB" },
    { key: "strike_outs", header: "SO" },
    { key: "stolen_bases", header: "SB" },
    { key: "avg", header: "AVG" },
    { key: "slg", header: "SLG" },
    { key: "player_id", header: "Player ID" },
  ],
  leadersPitching: [
    { key: "full_name", header: "Player" },
    { key: "primary_position", header: "Position" },
    { key: "seasons", header: "Seasons" },
    { key: "games", header: "G" },
    { key: "innings_pitched", header: "IP" },
    { key: "wins", header: "W" },
    { key: "losses", header: "L" },
    { key: "saves", header: "SV" },
    { key: "earned_runs", header: "ER" },
    { key: "strike_outs", header: "SO" },
    { key: "era", header: "ERA" },
    { key: "player_id", header: "Player ID" },
  ],
  seasons: [
    { key: "season", header: "Season" },
    { key: "wins", header: "W" },
    { key: "losses", header: "L" },
    { key: "win_pct", header: "Win%" },
    { key: "division_rank", header: "Div Rank" },
    { key: "league_rank", header: "Lg Rank" },
    { key: "games_back", header: "GB" },
    { key: "runs_scored", header: "RS" },
    { key: "runs_allowed", header: "RA" },
    { key: "run_diff", header: "Run Diff" },
    { key: "home_attendance", header: "Home Attendance" },
  ],
};

/** Build a CSV string (RFC-4180 quoting) from rows + ordered columns. */
export function toCsv(rows: Record<string, unknown>[], cols: Column[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.map((c) => esc(c.header)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c.key])).join(","));
  return lines.join("\n") + "\n";
}

/** Reshape rows into {Header: value} objects in column order — for xlsx sheets. */
export function toLabeledRows(
  rows: Record<string, unknown>[],
  cols: Column[],
): Record<string, unknown>[] {
  return rows.map((r) =>
    Object.fromEntries(cols.map((c) => [c.header, r[c.key] ?? ""])),
  );
}
