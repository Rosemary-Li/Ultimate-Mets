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

export function getPool(): Pool {
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

/** Distinct regular-season years that have games, newest first. */
export async function getGameSeasons(): Promise<number[]> {
  const rows = await query<{ season: number }>(
    `SELECT DISTINCT season FROM games
     WHERE game_type = 'R' AND season IS NOT NULL
     ORDER BY season DESC`,
  );
  return rows.map((r) => r.season);
}

export interface GameLogRow extends Game {
  mets_won: number;
  running_w: number;
  running_l: number;
  win_pitcher: string | null;
  loss_pitcher: string | null;
  save_pitcher: string | null;
}

/**
 * A full regular-season game log (newest first), enriched without any new
 * ingest: running W–L record (window function over the season) and the
 * winning / losing / save pitchers (per-game decision flags in pitching_stats).
 */
export async function getSeasonGameLog(season: number): Promise<GameLogRow[]> {
  return query<GameLogRow>(
    `WITH base AS (
       SELECT *,
         CASE WHEN (mets_is_home = 1 AND home_is_winner = 1)
                OR (mets_is_home = 0 AND away_is_winner = 1)
              THEN 1 ELSE 0 END AS mets_won
       FROM games
       WHERE season = $1 AND game_type = 'R' AND status_code = 'F'
     ),
     running AS (
       SELECT *,
         SUM(mets_won)     OVER w AS running_w,
         SUM(1 - mets_won) OVER w AS running_l
       FROM base
       WINDOW w AS (ORDER BY official_date, game_number
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
     )
     SELECT r.*,
       (SELECT pl.full_name FROM pitching_stats ps JOIN players pl USING (player_id)
          WHERE ps.game_pk = r.game_pk AND ps.wins   = 1 LIMIT 1) AS win_pitcher,
       (SELECT pl.full_name FROM pitching_stats ps JOIN players pl USING (player_id)
          WHERE ps.game_pk = r.game_pk AND ps.losses = 1 LIMIT 1) AS loss_pitcher,
       (SELECT pl.full_name FROM pitching_stats ps JOIN players pl USING (player_id)
          WHERE ps.game_pk = r.game_pk AND ps.saves  = 1 LIMIT 1) AS save_pitcher
     FROM running r
     ORDER BY r.official_date DESC, r.game_number DESC`,
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

/**
 * Current-season roster, everyday players first (most career games batting → the
 * recognizable regulars, not bench arms), and only those with a real photo — for
 * the home hero face band.
 */
export async function getCurrentPlayers(limit = 6): Promise<Player[]> {
  return query<Player>(
    `SELECT d.*
     FROM v_player_directory d
     LEFT JOIN v_player_career_batting cb USING (player_id)
     WHERE d.is_current AND d.photo_url IS NOT NULL
     ORDER BY COALESCE(cb.games, 0) DESC, d.full_name
     LIMIT $1`,
    [limit],
  );
}

export interface PlayerRow extends Player {
  position_type: string | null;
  bat_avg: string | null;
  bat_hr: number | null;
  bat_rbi: number | null;
  bat_games: number | null;
  era: string | null;
  wins: number | null;
  losses: number | null;
  pit_so: number | null;
  pit_games: number | null;
}

/**
 * Full roster directory joined to career batting & pitching totals — for the
 * data-dense Players page (summary, filters, sort, per-card stats).
 */
export async function getPlayersWithStats(): Promise<PlayerRow[]> {
  return query<PlayerRow>(`
    SELECT d.*,
      cb.avg AS bat_avg, cb.home_runs AS bat_hr, cb.rbi AS bat_rbi, cb.games AS bat_games,
      cp.era, cp.wins, cp.losses, cp.strike_outs AS pit_so, cp.games AS pit_games
    FROM v_player_directory d
    LEFT JOIN v_player_career_batting  cb USING (player_id)
    LEFT JOIN v_player_career_pitching cp USING (player_id)
    ORDER BY d.full_name
  `);
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

/** All Mets seasons in the DB, newest first, with home regular-season attendance. */
export async function getSeasons(): Promise<TeamSeason[]> {
  return query<TeamSeason>(`
    SELECT ts.*, att.home_attendance
    FROM team_season ts
    LEFT JOIN (
      SELECT season, SUM(attendance) AS home_attendance
      FROM games
      WHERE mets_is_home = 1 AND game_type = 'R' AND status_code = 'F'
      GROUP BY season
    ) att ON att.season = ts.season
    ORDER BY ts.season DESC
  `);
}

export interface FranchiseSummary {
  wins: number;
  losses: number;
  appearances: number;
  pennants: number;
  ws_titles: number;
  first_season: number | null;
  last_season: number | null;
}

/** Team-history header totals (à la a franchise encyclopedia). */
export async function getFranchiseSummary(): Promise<FranchiseSummary | null> {
  const rows = await query<FranchiseSummary>(`
    SELECT
      (SELECT COALESCE(SUM(wins), 0)   FROM team_season)                              AS wins,
      (SELECT COALESCE(SUM(losses), 0) FROM team_season)                              AS losses,
      (SELECT COUNT(DISTINCT season)   FROM v_postseason_series)                      AS appearances,
      (SELECT COUNT(DISTINCT season)   FROM v_postseason_series WHERE game_type='W')  AS pennants,
      (SELECT COUNT(DISTINCT season)   FROM v_postseason_series
         WHERE game_type='W' AND mets_wins > mets_losses)                            AS ws_titles,
      (SELECT MIN(season) FROM team_season) AS first_season,
      (SELECT MAX(season) FROM team_season) AS last_season
  `);
  return rows[0] ?? null;
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
  photo_url?: string | null;
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
    source = `(SELECT v.*, pl.full_name, pl.primary_position, pl.photo_url
               FROM ${view} v JOIN players pl USING (player_id)
               WHERE v.season = $1) s`;
  }

  const where = qual ? `WHERE ${qual}` : "";
  const sql = `SELECT player_id, full_name, primary_position, photo_url, ${stat} AS value
               FROM ${source} ${where}
               ORDER BY ${stat} ${dir} NULLS LAST
               LIMIT ${Number(limit)}`;
  return query<LeaderRow>(sql, params);
}

// ---------------------------------------------------------------- editorial

export async function getTrending(): Promise<Trending[]> {
  return query<Trending>(`SELECT * FROM trending ORDER BY position`);
}

export interface TrendingItem {
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Auto-derived "Trending" from real data — updates itself as the DB changes.
 * (There's no real social/traffic signal, so this approximates "what's notable
 * right now" from recent results + current/career leaders.)
 */
export async function getAutoTrending(): Promise<TrendingItem[]> {
  const items: TrendingItem[] = [];
  const seen = new Set<number>();

  // NOTE: the most-recent game already has its own prominent "Latest Game" card
  // on the homepage, so it's intentionally NOT repeated here — Trending leads
  // with notable performers (season & career leaders) and the latest playoff run.

  // current-season leaders (HR, strikeouts)
  const latest = await query<{ season: number }>(
    `SELECT MAX(season) AS season FROM games WHERE game_type='R'`,
  );
  const season = latest[0]?.season;
  if (season) {
    const hr = await query<{ player_id: number; full_name: string; home_runs: number }>(
      `SELECT b.player_id, pl.full_name, b.home_runs
       FROM v_player_season_batting b JOIN players pl USING(player_id)
       WHERE b.season=$1 ORDER BY b.home_runs DESC LIMIT 1`,
      [season],
    );
    if (hr[0]?.home_runs) {
      seen.add(hr[0].player_id);
      items.push({
        title: hr[0].full_name,
        subtitle: `${hr[0].home_runs} HR · ${season} team leader`,
        href: `/players/${hr[0].player_id}`,
      });
    }
    const so = await query<{ player_id: number; full_name: string; strike_outs: number }>(
      `SELECT p.player_id, pl.full_name, p.strike_outs
       FROM v_player_season_pitching p JOIN players pl USING(player_id)
       WHERE p.season=$1 ORDER BY p.strike_outs DESC LIMIT 1`,
      [season],
    );
    if (so[0]?.strike_outs) {
      seen.add(so[0].player_id);
      items.push({
        title: so[0].full_name,
        subtitle: `${so[0].strike_outs} K · ${season} team leader`,
        href: `/players/${so[0].player_id}`,
      });
    }
  }

  // career HR leader (becomes all-time once full history is ingested)
  const chr = await query<{ player_id: number; full_name: string; home_runs: number }>(
    `SELECT player_id, full_name, home_runs FROM mv_career_batting_leaders
     ORDER BY home_runs DESC LIMIT 1`,
  );
  if (chr[0]?.home_runs && !seen.has(chr[0].player_id)) {
    items.push({
      title: chr[0].full_name,
      subtitle: `${chr[0].home_runs} HR · franchise career leader`,
      href: `/players/${chr[0].player_id}`,
    });
  }

  // most recent postseason run
  const ps = await query<{ season: number }>(
    `SELECT season FROM v_postseason_series ORDER BY season DESC LIMIT 1`,
  );
  if (ps[0]?.season) {
    items.push({
      title: `${ps[0].season} Postseason`,
      subtitle: "Playoff run · series & results",
      href: `/postseason/${ps[0].season}`,
    });
  }

  return items;
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
  const clauses: string[] = ["thumb_url IS NOT NULL"];
  const params: unknown[] = [];
  if (opts.type) {
    params.push(opts.type);
    clauses.push(`media_type = $${params.length}`);
  }
  if (opts.season) {
    params.push(opts.season);
    clauses.push(`season = $${params.length}`);
  }
  params.push(opts.limit ?? 120);
  return query<MediaItem>(
    `SELECT * FROM media_items WHERE ${clauses.join(" AND ")}
     ORDER BY published_at DESC NULLS LAST, featured DESC
     LIMIT $${params.length}`,
    params,
  );
}

/**
 * game_pk → official MLB.com recap article URL, for the games that have one.
 * Used to point video/photo cards at an MLB.com page instead of a raw asset.
 */
export async function getGameArticleLinks(): Promise<Record<number, string>> {
  const rows = await query<{ game_pk: number; url: string }>(
    `SELECT DISTINCT ON (game_pk) game_pk, url FROM media_items
     WHERE media_type = 'article' AND game_pk IS NOT NULL AND url IS NOT NULL
     ORDER BY game_pk, published_at DESC NULLS LAST`,
  );
  const m: Record<number, string> = {};
  for (const r of rows) m[r.game_pk] = r.url;
  return m;
}

/** Distinct seasons that have media, newest first (for filter chips). */
export async function getMediaSeasons(): Promise<number[]> {
  const rows = await query<{ season: number }>(
    `SELECT DISTINCT season FROM media_items WHERE season IS NOT NULL ORDER BY season DESC`,
  );
  return rows.map((r) => r.season);
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

/**
 * Career batting totals for a set of players (for the Lab comparison).
 * Reads the LIVE view (not the materialized leaderboard) so added players show
 * current data immediately, even while a backfill is running.
 */
export async function getCareerBattingForPlayers(
  ids: number[],
): Promise<CareerBatting[]> {
  if (ids.length === 0) return [];
  return query<CareerBatting>(
    `SELECT cb.*, pl.full_name, pl.primary_position
     FROM v_player_career_batting cb JOIN players pl USING (player_id)
     WHERE cb.player_id = ANY($1::bigint[])`,
    [ids],
  );
}

export interface CareerPitching {
  player_id: number;
  full_name: string | null;
  primary_position: string | null;
  seasons: number;
  games: number;
  innings_pitched: string | null;
  earned_runs: number;
  strike_outs: number;
  wins: number;
  losses: number;
  saves: number;
  era: string | null;
}

/** Career pitching totals for a set of players (live view). */
export async function getCareerPitchingForPlayers(
  ids: number[],
): Promise<CareerPitching[]> {
  if (ids.length === 0) return [];
  return query<CareerPitching>(
    `SELECT cp.*, pl.full_name, pl.primary_position
     FROM v_player_career_pitching cp JOIN players pl USING (player_id)
     WHERE cp.player_id = ANY($1::bigint[])`,
    [ids],
  );
}

// ---------------------------------------------------------------- site stats

/** Home-page hero counts, computed from the data (never hardcoded). */
export async function getSiteStats(): Promise<SiteStats | null> {
  const rows = await query<SiteStats>(`SELECT * FROM v_site_stats`);
  return rows[0] ?? null;
}
