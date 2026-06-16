-- Ultimate Mets — game-level schema (Phase 1)
--
-- SQLite-compatible DDL. The same DDL works on PostgreSQL with two tweaks:
--   * INTEGER PRIMARY KEY            -> BIGINT PRIMARY KEY
--   * TEXT DEFAULT CURRENT_TIMESTAMP -> TIMESTAMPTZ DEFAULT now()
-- (The idempotent UPSERT in ingest_games.py is already valid on both engines.)

CREATE TABLE IF NOT EXISTS games (
    game_pk        INTEGER PRIMARY KEY,   -- MLB's unique per-game id; the basis for dedup
    official_date  TEXT,                  -- 'YYYY-MM-DD' (handles cross-midnight / DH correctly)
    game_datetime  TEXT,                  -- ISO-8601 UTC start time
    season         INTEGER,
    game_type      TEXT,                  -- R=regular, S=spring, P/D/L/W=postseason, etc.
    status         TEXT,                  -- detailedState, e.g. 'Final', 'Postponed', 'In Progress'
    status_code    TEXT,                  -- statusCode, e.g. 'F', 'DR', 'I'
    double_header  TEXT,                  -- 'N' none, 'Y' traditional, 'S' split
    game_number    INTEGER,               -- 1 or 2 within a double-header
    home_team_id   INTEGER,
    home_team_name TEXT,
    home_score     INTEGER,
    home_is_winner INTEGER,               -- 0/1
    away_team_id   INTEGER,
    away_team_name TEXT,
    away_score     INTEGER,
    away_is_winner INTEGER,               -- 0/1
    venue_id       INTEGER,
    venue_name     TEXT,
    mets_is_home   INTEGER,               -- 0/1 convenience flag (Mets teamId = 121)
    updated_at     TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_official_date ON games(official_date);
CREATE INDEX IF NOT EXISTS idx_games_season        ON games(season);
CREATE INDEX IF NOT EXISTS idx_games_status        ON games(status);
