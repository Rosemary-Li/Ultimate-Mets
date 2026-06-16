-- ============================================================
-- Ultimate Mets — database roles & privilege isolation
-- ============================================================
-- Run ONCE as a superuser (e.g. `psql ultimate_mets -f roles.sql`), after editing
-- the passwords below. This enforces, at the database level, that:
--
--   * mets_pipeline  — the daily ingest job. Can WRITE only the auto-data tables
--                      (games, players, batting_stats, pitching_stats, standings).
--                      It is NEVER granted write on editorial tables, so an
--                      automated run can't possibly overwrite human-entered content.
--   * mets_web       — the Next.js app. READ-ONLY on everything.
--   * mets_editor    — owns/maintains editorial tables (media, today_in_history,
--                      trending). The pipeline role has no access to these.
--
-- This is a mechanism, not a convention: privileges are checked by Postgres.

-- ---- roles (edit the passwords) ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mets_pipeline') THEN
    CREATE ROLE mets_pipeline LOGIN PASSWORD 'CHANGE_ME_pipeline';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mets_web') THEN
    CREATE ROLE mets_web LOGIN PASSWORD 'CHANGE_ME_web';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mets_editor') THEN
    CREATE ROLE mets_editor LOGIN PASSWORD 'CHANGE_ME_editor';
  END IF;
END $$;

-- Everyone may connect and resolve schema objects.
GRANT CONNECT ON DATABASE ultimate_mets TO mets_pipeline, mets_web, mets_editor;
GRANT USAGE  ON SCHEMA public            TO mets_pipeline, mets_web, mets_editor;

-- ---- auto-data tables: pipeline writes, web reads ----
-- (List tables explicitly so editorial tables are never swept in by a blanket grant.)
GRANT SELECT, INSERT, UPDATE, DELETE
  ON games, players, batting_stats, pitching_stats
  TO mets_pipeline;
-- standings table is added in the seasons slice; grant it there too.

GRANT SELECT
  ON games, players, batting_stats, pitching_stats
  TO mets_web;

-- ---- editorial tables (created by schema_editorial.sql): editor writes, web reads ----
-- The pipeline role is deliberately omitted. When the editorial tables exist, run:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON media_items, today_in_history, trending TO mets_editor;
--   GRANT SELECT ON media_items, today_in_history, trending TO mets_web;

-- ---- views are read by the web role ----
-- Run after views.sql is applied (views inherit nothing automatically):
--   GRANT SELECT ON ALL TABLES IN SCHEMA public TO mets_web;  -- includes views
-- (mets_web is read-only, so a blanket SELECT is safe for it.)

-- Make future tables/views readable by web by default (optional convenience):
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mets_web;
