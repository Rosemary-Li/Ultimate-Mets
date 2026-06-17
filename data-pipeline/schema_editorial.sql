-- ============================================================
-- Ultimate Mets — EDITORIAL schema (human-curated, NOT pipeline data)
-- ============================================================
-- These tables hold content the MLB API can't provide: "Today in Mets History"
-- narrative blurbs and the (fallback) Trending list.
--
-- The daily pipeline role (mets_pipeline) is NEVER granted write on them (see
-- roles.sql), so an automated run cannot overwrite human-entered content. They
-- are populated by seed_editorial.py and edited by hand.
--
-- NOTE: media_items moved to schema.sql — real game highlights ARE available from
-- the MLB content API, so media is now auto-ingested (ingest_media.py).

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

-- (media_items lives in schema.sql now — see note above.)
