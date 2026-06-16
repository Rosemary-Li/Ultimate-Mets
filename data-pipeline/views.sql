-- ============================================================
-- Ultimate Mets — aggregation views
-- ============================================================
-- Career/season totals and leaderboards are DERIVED from the raw per-game tables,
-- never stored. This keeps a single source of truth. Plain views recompute on
-- every query (fine for season-sized data). For heavy all-time leaderboards,
-- promote to MATERIALIZED VIEW (see bottom) and REFRESH after each daily run —
-- that's a performance cache, not a second source of truth.
--
-- All player/season aggregates join the games table and filter game_type = 'R'
-- (regular season). The raw tables still hold spring-training and postseason
-- lines; we just don't count them toward regular-season totals.
--
-- Apply with: psql ultimate_mets -f views.sql   (re-run to update definitions)

-- Pitching views change innings_pitched's type, which CREATE OR REPLACE can't do;
-- drop them first so the file is safe to re-run.
DROP VIEW IF EXISTS v_player_season_pitching, v_player_career_pitching;

-- ---- Player season batting totals (Mets, regular season) ----
CREATE OR REPLACE VIEW v_player_season_batting AS
SELECT
    b.player_id,
    b.season,
    COUNT(*)                       AS games,
    SUM(b.at_bats)                 AS at_bats,
    SUM(b.runs)                    AS runs,
    SUM(b.hits)                    AS hits,
    SUM(b.doubles)                 AS doubles,
    SUM(b.triples)                 AS triples,
    SUM(b.home_runs)               AS home_runs,
    SUM(b.rbi)                     AS rbi,
    SUM(b.walks)                   AS walks,
    SUM(b.strike_outs)             AS strike_outs,
    SUM(b.stolen_bases)            AS stolen_bases,
    SUM(b.total_bases)             AS total_bases,
    ROUND(SUM(b.hits)::numeric      / NULLIF(SUM(b.at_bats), 0), 3) AS avg,
    ROUND((SUM(b.hits) + SUM(b.walks) + SUM(b.hit_by_pitch))::numeric
          / NULLIF(SUM(b.at_bats) + SUM(b.walks) + SUM(b.hit_by_pitch) + SUM(b.sac_flies), 0), 3) AS obp,
    ROUND(SUM(b.total_bases)::numeric / NULLIF(SUM(b.at_bats), 0), 3) AS slg
FROM batting_stats b
JOIN games g ON g.game_pk = b.game_pk AND g.game_type = 'R'
WHERE b.is_mets = 1
GROUP BY b.player_id, b.season;

-- ---- Player career batting totals (Mets, regular season) ----
CREATE OR REPLACE VIEW v_player_career_batting AS
SELECT
    b.player_id,
    COUNT(DISTINCT b.season)       AS seasons,
    COUNT(*)                       AS games,
    SUM(b.at_bats)                 AS at_bats,
    SUM(b.runs)                    AS runs,
    SUM(b.hits)                    AS hits,
    SUM(b.doubles)                 AS doubles,
    SUM(b.triples)                 AS triples,
    SUM(b.home_runs)               AS home_runs,
    SUM(b.rbi)                     AS rbi,
    SUM(b.walks)                   AS walks,
    SUM(b.strike_outs)             AS strike_outs,
    SUM(b.stolen_bases)            AS stolen_bases,
    SUM(b.total_bases)             AS total_bases,
    ROUND(SUM(b.hits)::numeric      / NULLIF(SUM(b.at_bats), 0), 3) AS avg,
    ROUND(SUM(b.total_bases)::numeric / NULLIF(SUM(b.at_bats), 0), 3) AS slg
FROM batting_stats b
JOIN games g ON g.game_pk = b.game_pk AND g.game_type = 'R'
WHERE b.is_mets = 1
GROUP BY b.player_id;

-- ---- Player season pitching totals (Mets, regular season) ----
CREATE VIEW v_player_season_pitching AS
SELECT
    p.player_id,
    p.season,
    COUNT(*)                       AS games,
    SUM(p.games_started)           AS games_started,
    SUM(p.outs)                    AS outs,
    -- baseball notation: 37 outs -> '12.1' (12 and 1/3 innings)
    (SUM(p.outs) / 3)::int || '.' || (SUM(p.outs) % 3)::int AS innings_pitched,
    SUM(p.hits)                    AS hits,
    SUM(p.runs)                    AS runs,
    SUM(p.earned_runs)             AS earned_runs,
    SUM(p.home_runs)               AS home_runs,
    SUM(p.walks)                   AS walks,
    SUM(p.strike_outs)             AS strike_outs,
    SUM(p.wins)                    AS wins,
    SUM(p.losses)                  AS losses,
    SUM(p.saves)                   AS saves,
    ROUND(SUM(p.earned_runs)::numeric * 27 / NULLIF(SUM(p.outs), 0), 2) AS era,
    ROUND((SUM(p.walks) + SUM(p.hits))::numeric * 3 / NULLIF(SUM(p.outs), 0), 3) AS whip
FROM pitching_stats p
JOIN games g ON g.game_pk = p.game_pk AND g.game_type = 'R'
WHERE p.is_mets = 1
GROUP BY p.player_id, p.season;

-- ---- Player career pitching totals (Mets, regular season) ----
CREATE VIEW v_player_career_pitching AS
SELECT
    p.player_id,
    COUNT(DISTINCT p.season)       AS seasons,
    COUNT(*)                       AS games,
    SUM(p.outs)                    AS outs,
    (SUM(p.outs) / 3)::int || '.' || (SUM(p.outs) % 3)::int AS innings_pitched,
    SUM(p.earned_runs)             AS earned_runs,
    SUM(p.strike_outs)             AS strike_outs,
    SUM(p.wins)                    AS wins,
    SUM(p.losses)                  AS losses,
    SUM(p.saves)                   AS saves,
    ROUND(SUM(p.earned_runs)::numeric * 27 / NULLIF(SUM(p.outs), 0), 2) AS era
FROM pitching_stats p
JOIN games g ON g.game_pk = p.game_pk AND g.game_type = 'R'
WHERE p.is_mets = 1
GROUP BY p.player_id;

-- ---- Site-wide counts for the home hero (computed, regular + postseason) ----
CREATE OR REPLACE VIEW v_site_stats AS
SELECT
    (SELECT COUNT(DISTINCT season) FROM games WHERE game_type = 'R')   AS seasons,
    (SELECT COUNT(*) FROM players)                                     AS players,
    (SELECT COUNT(*) FROM games
       WHERE game_type = 'R' AND status_code = 'F')                    AS games,
    (SELECT COUNT(DISTINCT season) FROM games
       WHERE game_type IN ('F','D','L','W'))                           AS postseasons;

-- ---- Player directory: every player + an is_current flag ----
-- "Current" = appeared for the Mets in the latest regular season present in the DB.
-- (Roster-season membership isn't stored separately, so we derive it from stats.)
CREATE OR REPLACE VIEW v_player_directory AS
WITH latest AS (
    SELECT MAX(season) AS s FROM games WHERE game_type = 'R'
),
curr AS (
    SELECT player_id FROM batting_stats
      WHERE is_mets = 1 AND season = (SELECT s FROM latest)
    UNION
    SELECT player_id FROM pitching_stats
      WHERE is_mets = 1 AND season = (SELECT s FROM latest)
)
SELECT
    p.*,
    (p.player_id IN (SELECT player_id FROM curr)) AS is_current
FROM players p;

-- ============================================================
-- Heavy leaderboards — promote to materialized views when needed.
-- Example (career HR leaderboard) and a refresh you call after the daily load:
--
--   CREATE MATERIALIZED VIEW IF NOT EXISTS mv_career_hr_leaders AS
--     SELECT player_id, home_runs FROM v_player_career_batting ORDER BY home_runs DESC;
--   -- after the pipeline runs:  REFRESH MATERIALIZED VIEW mv_career_hr_leaders;
-- ============================================================
