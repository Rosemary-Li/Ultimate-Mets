import { Pool } from "pg";
import type {
  Game,
  Player,
  SeasonBatting,
  SeasonPitching,
  SiteStats,
  TeamSeason,
  BoxBatting,
  BoxPitching,
  LinescoreInning,
} from "./types";

// Postgres connection. Set DATABASE_URL (libpq connection string), e.g.
//   postgresql://localhost:5432/ultimate_mets
// A single shared Pool is reused across requests (and across hot reloads in dev).
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://localhost:5432/ultimate_mets";

// Cache the pool on globalThis so Next's dev hot-reload doesn't open a new pool
// on every change.
const globalForPg = globalThis as unknown as { _metsPool?: Pool };

function getPool(): Pool {
  if (!globalForPg._metsPool) {
    globalForPg._metsPool = new Pool({ connectionString, max: 5 });
  }
  return globalForPg._metsPool;
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const res = await getPool().query(sql, params);
    return res.rows as T[];
  } catch (err) {
    // DB unavailable / not yet provisioned — callers fall back to empty data so
    // the site still renders on its illustrative content.
    console.error("[db] query failed:", (err as Error).message);
    return [];
  }
}

/** Most recent final games, newest first. Empty if the DB is unavailable. */
export async function getRecentGames(limit = 10): Promise<Game[]> {
  return query<Game>(
    `SELECT * FROM games
     WHERE status_code = 'F' AND game_type NOT IN ('S', 'E', 'A')
     ORDER BY official_date DESC, game_number DESC
     LIMIT $1`,
    [limit],
  );
}

/** A single game by its MLB game_pk, or null. */
export async function getGame(gamePk: number): Promise<Game | null> {
  const rows = await query<Game>(`SELECT * FROM games WHERE game_pk = $1`, [
    gamePk,
  ]);
  return rows[0] ?? null;
}

/** Box-score batting lines for a game (both teams), joined to player names. */
export async function getGameBatting(gamePk: number): Promise<BoxBatting[]> {
  return query<BoxBatting>(
    `SELECT b.player_id, pl.full_name, b.team_id, b.is_mets, b.batting_order,
            b.position, b.at_bats, b.runs, b.hits, b.doubles, b.triples,
            b.home_runs, b.rbi, b.walks, b.strike_outs, b.stolen_bases
     FROM batting_stats b LEFT JOIN players pl USING (player_id)
     WHERE b.game_pk = $1
     ORDER BY b.is_mets DESC, b.batting_order NULLS LAST, b.at_bats DESC`,
    [gamePk],
  );
}

/** Box-score pitching lines for a game (both teams), joined to player names. */
export async function getGamePitching(gamePk: number): Promise<BoxPitching[]> {
  return query<BoxPitching>(
    `SELECT p.player_id, pl.full_name, p.team_id, p.is_mets, p.innings_pitched,
            p.hits, p.runs, p.earned_runs, p.walks, p.strike_outs, p.home_runs
     FROM pitching_stats p LEFT JOIN players pl USING (player_id)
     WHERE p.game_pk = $1
     ORDER BY p.is_mets DESC, p.games_started DESC NULLS LAST, p.outs DESC`,
    [gamePk],
  );
}

/** Per-inning linescore for a game. */
export async function getLinescore(gamePk: number): Promise<LinescoreInning[]> {
  return query<LinescoreInning>(
    `SELECT * FROM game_linescore WHERE game_pk = $1 ORDER BY inning_num`,
    [gamePk],
  );
}

/** Games for a season, in chronological order. */
export async function getGamesBySeason(season: number): Promise<Game[]> {
  return query<Game>(
    `SELECT * FROM games WHERE season = $1 ORDER BY official_date, game_number`,
    [season],
  );
}

// ---------------------------------------------------------------- players

/**
 * Player directory (includes the is_current flag), optionally filtered by name.
 * is_current = appeared for the Mets in the latest season in the DB.
 */
export async function getPlayers(search?: string, limit = 1000): Promise<Player[]> {
  if (search) {
    return query<Player>(
      `SELECT * FROM v_player_directory WHERE full_name ILIKE $1
       ORDER BY full_name LIMIT $2`,
      [`%${search}%`, limit],
    );
  }
  return query<Player>(
    `SELECT * FROM v_player_directory ORDER BY full_name LIMIT $1`,
    [limit],
  );
}

export async function getPlayer(playerId: number): Promise<Player | null> {
  const rows = await query<Player>(
    `SELECT * FROM players WHERE player_id = $1`,
    [playerId],
  );
  return rows[0] ?? null;
}

export async function getPlayerSeasonBatting(
  playerId: number,
): Promise<SeasonBatting[]> {
  return query<SeasonBatting>(
    `SELECT * FROM v_player_season_batting WHERE player_id = $1 ORDER BY season`,
    [playerId],
  );
}

export async function getPlayerSeasonPitching(
  playerId: number,
): Promise<SeasonPitching[]> {
  return query<SeasonPitching>(
    `SELECT * FROM v_player_season_pitching WHERE player_id = $1 ORDER BY season`,
    [playerId],
  );
}

// ---------------------------------------------------------------- seasons

/** All Mets seasons in the DB, newest first. */
export async function getSeasons(): Promise<TeamSeason[]> {
  return query<TeamSeason>(`SELECT * FROM team_season ORDER BY season DESC`);
}

/** A single season's standings line, or null. */
export async function getSeason(season: number): Promise<TeamSeason | null> {
  const rows = await query<TeamSeason>(
    `SELECT * FROM team_season WHERE season = $1`,
    [season],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------- site stats

/** Home-page hero counts, computed from the data (never hardcoded). */
export async function getSiteStats(): Promise<SiteStats | null> {
  const rows = await query<SiteStats>(`SELECT * FROM v_site_stats`);
  return rows[0] ?? null;
}
