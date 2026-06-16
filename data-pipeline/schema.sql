-- Ultimate Mets — game-level schema (PostgreSQL).
--
-- official_date / game_datetime are kept as TEXT (the MLB API already returns
-- 'YYYY-MM-DD' and ISO-8601 strings) so the web layer receives them verbatim.
-- The 0/1 flags are SMALLINT to match the values the ingest script produces.

CREATE TABLE IF NOT EXISTS games (
    game_pk        BIGINT PRIMARY KEY,    -- MLB's unique per-game id; the basis for dedup
    official_date  TEXT,                  -- 'YYYY-MM-DD' (handles cross-midnight / DH correctly)
    game_datetime  TEXT,                  -- ISO-8601 UTC start time
    season         INTEGER,
    game_type      TEXT,                  -- R=regular, S=spring, P/D/L/W=postseason, etc.
    status         TEXT,                  -- detailedState, e.g. 'Final', 'Postponed', 'In Progress'
    status_code    TEXT,                  -- statusCode, e.g. 'F', 'DR', 'I'
    double_header  TEXT,                  -- 'N' none, 'Y' traditional, 'S' split
    game_number    SMALLINT,              -- 1 or 2 within a double-header
    home_team_id   INTEGER,
    home_team_name TEXT,
    home_score     INTEGER,
    home_is_winner SMALLINT,              -- 0/1
    away_team_id   INTEGER,
    away_team_name TEXT,
    away_score     INTEGER,
    away_is_winner SMALLINT,              -- 0/1
    venue_id       INTEGER,
    venue_name     TEXT,
    mets_is_home   SMALLINT,              -- 0/1 convenience flag (Mets teamId = 121)
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_official_date ON games (official_date);
CREATE INDEX IF NOT EXISTS idx_games_season        ON games (season);
CREATE INDEX IF NOT EXISTS idx_games_status        ON games (status);


-- ============================================================
-- Players domain (auto data — written by the pipeline)
-- ============================================================

-- One row per person who has appeared for the Mets. player_id = MLB person id.
CREATE TABLE IF NOT EXISTS players (
    player_id        BIGINT PRIMARY KEY,
    full_name        TEXT,
    primary_number   TEXT,
    primary_position TEXT,    -- abbreviation, e.g. '3B', 'P', 'CF'
    position_type    TEXT,    -- 'Infielder', 'Pitcher', 'Outfielder', ...
    bat_side         TEXT,    -- 'R' / 'L' / 'S'
    pitch_hand       TEXT,    -- 'R' / 'L'
    birth_date       TEXT,    -- 'YYYY-MM-DD'
    birth_city       TEXT,
    birth_country    TEXT,
    height           TEXT,
    weight           INTEGER,
    mlb_debut_date   TEXT,
    name_slug        TEXT,
    active           BOOLEAN,
    updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_name ON players (full_name);
CREATE INDEX IF NOT EXISTS idx_players_slug ON players (name_slug);

-- One row per (game, batter). The raw, per-game line — career/season totals
-- are computed from this via views, never stored.
CREATE TABLE IF NOT EXISTS batting_stats (
    game_pk        BIGINT  NOT NULL,
    player_id      BIGINT  NOT NULL,
    team_id        INTEGER,
    is_mets        SMALLINT,        -- 1 if this line was for the Mets
    season         INTEGER,
    official_date  TEXT,
    batting_order  INTEGER,
    position       TEXT,
    plate_appearances INTEGER,
    at_bats        INTEGER,
    runs           INTEGER,
    hits           INTEGER,
    doubles        INTEGER,
    triples        INTEGER,
    home_runs      INTEGER,
    rbi            INTEGER,
    walks          INTEGER,         -- baseOnBalls
    intentional_walks INTEGER,
    strike_outs    INTEGER,
    stolen_bases   INTEGER,
    caught_stealing INTEGER,
    hit_by_pitch   INTEGER,
    sac_flies      INTEGER,
    sac_bunts      INTEGER,
    total_bases    INTEGER,
    left_on_base   INTEGER,
    updated_at     TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (game_pk, player_id)
);
CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_stats (player_id);
CREATE INDEX IF NOT EXISTS idx_batting_season ON batting_stats (season);

-- One row per (game, pitcher). innings_pitched is kept as the displayed string
-- ('5.2'); `outs` is the same value normalized to outs for safe aggregation
-- (5.2 IP = 17 outs), so ERA/WHIP can be summed correctly.
CREATE TABLE IF NOT EXISTS pitching_stats (
    game_pk        BIGINT  NOT NULL,
    player_id      BIGINT  NOT NULL,
    team_id        INTEGER,
    is_mets        SMALLINT,
    season         INTEGER,
    official_date  TEXT,
    games_started  INTEGER,
    innings_pitched TEXT,
    outs           INTEGER,
    hits           INTEGER,
    runs           INTEGER,
    earned_runs    INTEGER,
    home_runs      INTEGER,
    walks          INTEGER,
    intentional_walks INTEGER,
    strike_outs    INTEGER,
    hit_by_pitch   INTEGER,
    wins           INTEGER,
    losses         INTEGER,
    saves          INTEGER,
    number_of_pitches INTEGER,
    updated_at     TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (game_pk, player_id)
);
CREATE INDEX IF NOT EXISTS idx_pitching_player ON pitching_stats (player_id);
CREATE INDEX IF NOT EXISTS idx_pitching_season ON pitching_stats (season);
