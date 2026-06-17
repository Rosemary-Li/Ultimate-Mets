-- ============================================================
-- App domain — user accounts (Auth.js) + discussion comments.
--
-- This is USER-GENERATED data, separate from the read-only stats domain. The
-- Next.js app writes here (sessions, accounts, comments), so it must connect as
-- a role that can write THESE tables while staying read-only on everything else.
-- See the mets_app role at the bottom.
--
-- Apply once:  psql "$DATABASE_URL" -f schema_app.sql
-- ============================================================

-- ---- Auth.js (NextAuth) — official @auth/pg-adapter schema ----
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    email           VARCHAR(255),
    "emailVerified" TIMESTAMPTZ,
    image           TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
    id                  SERIAL PRIMARY KEY,
    "userId"            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(255) NOT NULL,
    provider            VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          BIGINT,
    id_token            TEXT,
    scope               TEXT,
    session_state       TEXT,
    token_type          TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id             SERIAL PRIMARY KEY,
    "userId"       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires        TIMESTAMPTZ NOT NULL,
    "sessionToken" VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_token (
    identifier TEXT NOT NULL,
    expires    TIMESTAMPTZ NOT NULL,
    token      TEXT NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ---- Discussion: per-page comment threads ----
-- target_type/target_id let one table serve every page:
--   ('game', game_pk) | ('player', player_id) | ('season', year)
CREATE TABLE IF NOT EXISTS comments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    parent_id   BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    edited_at   TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_comments_target
    ON comments (target_type, target_id, created_at);

-- ---- Role: the app connection (write app tables, read stats) ----
-- Superset of mets_web: it can SELECT everything AND write the app tables only.
-- Point the Next.js DATABASE_URL at this role in production.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mets_app') THEN
    CREATE ROLE mets_app LOGIN PASSWORD 'CHANGE_ME_app';
  END IF;
END $$;

GRANT CONNECT ON DATABASE ultimate_mets TO mets_app;
GRANT USAGE  ON SCHEMA public           TO mets_app;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO mets_app;  -- read stats + views
GRANT SELECT, INSERT, UPDATE, DELETE
  ON users, accounts, sessions, verification_token, comments
  TO mets_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mets_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mets_app;
