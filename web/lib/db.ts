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
  PostseasonSeries,
  Trending,
  TodayHistory,
  MediaItem,
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

// ---------------------------------------------------------------- postseason

/** Postseason series (all, or for one season), ordered by season then round. */
export async function getPostseasonSeries(
  season?: number,
): Promise<PostseasonSeries[]> {
  if (season != null) {
    return query<PostseasonSeries>(
      `SELECT * FROM v_postseason_series WHERE season = $1 ORDER BY round_order`,
      [season],
    );
  }
  return query<PostseasonSeries>(
    `SELECT * FROM v_postseason_series ORDER BY season DESC, round_order`,
  );
}

/** Postseason games for a season, in round + series-game order. */
export async function getPostseasonGames(season: number): Promise<Game[]> {
  return query<Game>(
    `SELECT * FROM games
     WHERE season = $1 AND game_type IN ('F','D','L','W') AND status_code = 'F'
     ORDER BY CASE game_type WHEN 'F' THEN 1 WHEN 'D' THEN 2 WHEN 'L' THEN 3 WHEN 'W' THEN 4 END,
              series_game_number`,
    [season],
  );
}

// ---------------------------------------------------------------- leaders

export interface LeaderRow {
  player_id: number;
  full_name: string | null;
  primary_position: string | null;
  value: number | string | null;
}

// Whitelist of rankable stats (column names) — guards against SQL injection,
// since column names can't be parameterized.
const BATTING_STATS = new Set([
  "home_runs", "hits", "rbi", "runs", "doubles", "triples",
  "stolen_bases", "walks", "total_bases", "avg", "slg",
]);
const PITCHING_STATS = new Set([
  "wins", "strike_outs", "saves", "era", "losses",
]);
const ASC_STATS = new Set(["era", "whip"]); // lower is better
const RATE_QUALIFIER: Record<string, string> = {
  avg: "at_bats >= 250",
  slg: "at_bats >= 250",
  era: "outs >= 150",
};

export type LeaderScope = "career" | "season";
export type LeaderType = "batting" | "pitching";

export async function getLeaders(opts: {
  scope: LeaderScope;
  type: LeaderType;
  stat: string;
  season?: number;
  limit?: number;
}): Promise<LeaderRow[]> {
  const { scope, type, stat, season, limit = 25 } = opts;
  const allowed = type === "batting" ? BATTING_STATS : PITCHING_STATS;
  if (!allowed.has(stat)) return [];

  const dir = ASC_STATS.has(stat) ? "ASC" : "DESC";
  // career qualifiers as defined; season uses lighter thresholds
  const qualBase = RATE_QUALIFIER[stat];
  const qual = qualBase
    ? scope === "season"
      ? qualBase.replace("250", "100").replace("150", "90")
      : qualBase
    : null;

  let source: string;
  const params: unknown[] = [];
  if (scope === "career") {
    source =
      type === "batting"
        ? "mv_career_batting_leaders"
        : "mv_career_pitching_leaders";
  } else {
    // season: join the season view to players for names
    const view =
      type === "batting"
        ? "v_player_season_batting"
        : "v_player_season_pitching";
    params.push(season);
    source = `(SELECT v.*, pl.full_name, pl.primary_position
               FROM ${view} v JOIN players pl USING (player_id)
               WHERE v.season = $1) s`;
  }

  const where = qual ? `WHERE ${qual}` : "";
  const sql = `SELECT player_id, full_name, primary_position, ${stat} AS value
               FROM ${source} ${where}
               ORDER BY ${stat} ${dir} NULLS LAST
               LIMIT ${Number(limit)}`;
  return query<LeaderRow>(sql, params);
}

// ---------------------------------------------------------------- editorial

export async function getTrending(): Promise<Trending[]> {
  return query<Trending>(`SELECT * FROM trending ORDER BY position`);
}

/** Editorial "Today in History" blurbs for a calendar date. */
export async function getTodayEditorial(
  month: number,
  day: number,
): Promise<TodayHistory[]> {
  return query<TodayHistory>(
    `SELECT * FROM today_in_history WHERE event_month = $1 AND event_day = $2
     ORDER BY event_year DESC`,
    [month, day],
  );
}

/** Mets regular-season games that fell on this calendar date (any year). */
export async function getGameAnniversaries(
  month: number,
  day: number,
): Promise<Game[]> {
  return query<Game>(
    `SELECT * FROM games
     WHERE EXTRACT(MONTH FROM official_date::date) = $1
       AND EXTRACT(DAY   FROM official_date::date) = $2
       AND game_type = 'R' AND status_code = 'F'
     ORDER BY season DESC`,
    [month, day],
  );
}

export async function getMediaCount(): Promise<number> {
  const rows = await query<{ n: string }>(`SELECT COUNT(*) AS n FROM media_items`);
  return rows[0] ? Number(rows[0].n) : 0;
}

export async function getMedia(opts: {
  type?: string;
  season?: number;
  limit?: number;
} = {}): Promise<MediaItem[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.type) {
    params.push(opts.type);
    clauses.push(`media_type = $${params.length}`);
  }
  if (opts.season) {
    params.push(opts.season);
    clauses.push(`season = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(opts.limit ?? 100);
  return query<MediaItem>(
    `SELECT * FROM media_items ${where}
     ORDER BY featured DESC, published_at DESC NULLS LAST
     LIMIT $${params.length}`,
    params,
  );
}

// ---------------------------------------------------------------- compare (Lab)

export interface CareerBatting {
  player_id: number;
  full_name: string | null;
  primary_position: string | null;
  seasons: number;
  games: number;
  at_bats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  rbi: number;
  walks: number;
  strike_outs: number;
  stolen_bases: number;
  total_bases: number;
  avg: string | null;
  slg: string | null;
}

/** Career batting totals for a set of players (for the Lab comparison). */
export async function getCareerBattingForPlayers(
  ids: number[],
): Promise<CareerBatting[]> {
  if (ids.length === 0) return [];
  return query<CareerBatting>(
    `SELECT * FROM mv_career_batting_leaders WHERE player_id = ANY($1::bigint[])`,
    [ids],
  );
}

// ---------------------------------------------------------------- site stats

/** Home-page hero counts, computed from the data (never hardcoded). */
export async function getSiteStats(): Promise<SiteStats | null> {
  const rows = await query<SiteStats>(`SELECT * FROM v_site_stats`);
  return rows[0] ?? null;
}
