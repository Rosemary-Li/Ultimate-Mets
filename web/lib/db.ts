import { Pool } from "pg";
import type {
  Game,
  Player,
  SeasonBatting,
  SeasonPitching,
  SiteStats,
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
     WHERE status_code = 'F'
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

/** Games for a season, in chronological order. */
export async function getGamesBySeason(season: number): Promise<Game[]> {
  return query<Game>(
    `SELECT * FROM games WHERE season = $1 ORDER BY official_date, game_number`,
    [season],
  );
}

// ---------------------------------------------------------------- players

/** Roster list, optionally filtered by a name search. */
export async function getPlayers(search?: string, limit = 500): Promise<Player[]> {
  if (search) {
    return query<Player>(
      `SELECT * FROM players WHERE full_name ILIKE $1
       ORDER BY full_name LIMIT $2`,
      [`%${search}%`, limit],
    );
  }
  return query<Player>(`SELECT * FROM players ORDER BY full_name LIMIT $1`, [
    limit,
  ]);
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

// ---------------------------------------------------------------- site stats

/** Home-page hero counts, computed from the data (never hardcoded). */
export async function getSiteStats(): Promise<SiteStats | null> {
  const rows = await query<SiteStats>(`SELECT * FROM v_site_stats`);
  return rows[0] ?? null;
}
