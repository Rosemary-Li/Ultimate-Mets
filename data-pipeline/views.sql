-- ============================================================
-- Ultimate Mets — aggregation views
-- ============================================================
-- Career/season totals and leaderboards are DERIVED from the raw per-game tables,
-- never stored. This keeps a single source of truth. Plain views recompute on
-- every query (fine for season-sized data). For heavy all-time leaderboards,
-- promote to MATERIALIZED VIEW (see bottom) and REFRESH after each daily run —
-- that's a performance cache, not a second source of truth.
--
-- Apply with: psql ultimate_mets -f views.sql   (re-run to update definitions)

-- ---- Player season batting totals (Mets games only) ----
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
    -- rate stats, guarding divide-by-zero
    ROUND(SUM(b.hits)::numeric      / NULLIF(SUM(b.at_bats), 0), 3) AS avg,
    ROUND((SUM(b.hits) + SUM(b.walks) + SUM(b.hit_by_pitch))::numeric
          / NULLIF(SUM(b.at_bats) + SUM(b.walks) + SUM(b.hit_by_pitch) + SUM(b.sac_flies), 0), 3) AS obp,
    ROUND(SUM(b.total_bases)::numeric / NULLIF(SUM(b.at_bats), 0), 3) AS slg
FROM batting_stats b
WHERE b.is_mets = 1
GROUP BY b.player_id, b.season;

-- ---- Player career batting totals (Mets) ----
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
WHERE b.is_mets = 1
GROUP BY b.player_id;

-- ---- Player season pitching totals (Mets) ----
CREATE OR REPLACE VIEW v_player_season_pitching AS
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
WHERE p.is_mets = 1
GROUP BY p.player_id, p.season;

-- ---- Player career pitching totals (Mets) ----
CREATE OR REPLACE VIEW v_player_career_pitching AS
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
WHERE p.is_mets = 1
GROUP BY p.player_id;

-- ---- Site-wide counts for the home hero (computed, not hardcoded) ----
CREATE OR REPLACE VIEW v_site_stats AS
SELECT
    (SELECT COUNT(DISTINCT season) FROM games)                       AS seasons,
    (SELECT COUNT(*) FROM players)                                   AS players,
    (SELECT COUNT(*) FROM games)                                     AS games,
    (SELECT COUNT(DISTINCT season) FROM games
       WHERE game_type IN ('P','D','L','W','F'))                     AS postseasons;

-- ============================================================
-- Heavy leaderboards — promote to materialized views when needed.
-- Example (career HR leaderboard) and a refresh you call after the daily load:
--
--   CREATE MATERIALIZED VIEW IF NOT EXISTS mv_career_hr_leaders AS
--     SELECT player_id, home_runs FROM v_player_career_batting ORDER BY home_runs DESC;
--   -- after the pipeline runs:  REFRESH MATERIALIZED VIEW mv_career_hr_leaders;
-- ============================================================
