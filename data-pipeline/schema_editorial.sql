-- ============================================================
-- Ultimate Mets — EDITORIAL schema (human-curated, NOT pipeline data)
-- ============================================================
-- These tables hold content the MLB API can't provide: media archive entries,
-- "Today in Mets History" narrative blurbs, and the weekly Trending list.
--
-- They are intentionally in a separate file from schema.sql. The daily pipeline
-- role (mets_pipeline) is NEVER granted write on them (see roles.sql), so an
-- automated run cannot overwrite human-entered content. They are populated by
-- seed_editorial.py and edited by hand.

-- "Today in Mets History" — the narrative text for a calendar date. The event
-- skeleton (which game happened on this date) is derived from the games table at
-- read time; this table holds only the prose a human wrote.
CREATE TABLE IF NOT EXISTS today_in_history (
    id          SERIAL PRIMARY KEY,
    event_month SMALLINT NOT NULL,   -- 1-12
    event_day   SMALLINT NOT NULL,   -- 1-31
    event_year  INTEGER,
    headline    TEXT,
    blurb       TEXT,
    meta        TEXT,                -- e.g. 'NYM 4, LAD 0'
    updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tih_date ON today_in_history (event_month, event_day);

-- Weekly "Trending" rail — a small curated list.
CREATE TABLE IF NOT EXISTS trending (
    id          SERIAL PRIMARY KEY,
    position    SMALLINT,            -- display order
    title       TEXT,
    subtitle    TEXT,
    href        TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Media archive (videos / photos / articles / podcasts).
CREATE TABLE IF NOT EXISTS media_items (
    id           SERIAL PRIMARY KEY,
    media_type   TEXT,               -- 'video' | 'photo' | 'article' | 'audio'
    title        TEXT,
    description  TEXT,
    era          TEXT,
    season       INTEGER,
    player_name  TEXT,
    source       TEXT,
    url          TEXT,
    published_at TEXT,
    featured     BOOLEAN DEFAULT false,
    updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_type   ON media_items (media_type);
CREATE INDEX IF NOT EXISTS idx_media_season ON media_items (season);
