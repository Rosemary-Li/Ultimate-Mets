# Ultimate Mets Database

A New York Mets stats and history site: a full-stack web app backed by a data
pipeline that ingests live data from the official MLB Stats API into PostgreSQL,
updated daily. Every player, season, game, and postseason moment — searchable,
comparable, connected, and open for discussion once you sign in.

## Architecture

```
MLB Stats API ──► data-pipeline (Python) ──► PostgreSQL ──► web (Next.js API + UI)
                                                  ▲
                              accounts + comments │ (Auth.js, written by the app)
```

```
.
├── web/             Next.js (App Router, TypeScript) front-end + back-end + auth
├── data-pipeline/   Python ETL that ingests MLB data into PostgreSQL (daily)
└── DEPLOY.md        Google Cloud deployment guide
```

The parts share one PostgreSQL database: the pipeline writes the stats domain, the web
app reads it (and writes the accounts/comments domain). Every page is wired to real data.

### Data coverage (full franchise history)

- **Standings & postseason — all 65 seasons (1962–2026):** record, finish, R/RA,
  attendance, every playoff series (2 World Series titles, 5 NL pennants, 11 appearances).
- **Games, box scores & player stats — all 1962–2026:** 10,311 regular-season games
  (10,995 incl. postseason), ~281k batting and ~71k pitching lines, 1,309 players. Career
  & season leaderboards are computed from these.
- **Media — 2024–2026 only:** the MLB content API only surfaces highlights, recaps, and
  photos for recent games, so the media archive is recent by nature (older seasons have no
  API media to index).

### Design principles

- **Single source of truth.** Career/season totals, leaderboards, postseason series, and
  the home-page counts are computed from raw per-game rows via SQL **views**, never stored.
  Heavy career leaderboards are cached as **materialized views** (refreshed after each daily
  load — a performance cache, not a second source).
- **Privilege isolation.** Four database roles: `mets_pipeline` writes only the auto-data
  tables, `mets_editor` owns the editorial tables, `mets_web` is read-only, and `mets_app`
  (the web app) can read everything but write **only** the accounts/comments tables. The
  pipeline can never write editorial or user content — enforced by Postgres, not convention.
- **Idempotent ingestion.** Every loader uses `INSERT ... ON CONFLICT DO UPDATE`, so
  daily/backfill runs never create duplicates.
- **Auto vs. editorial.** Stats come from the MLB API daily. Editorial content ("Today in
  History" prose, Trending) is human-curated; "Today in History" still derives its
  game-result skeleton automatically from the `games` table.
- **Media: link, don't host.** Media items are *indexed* from the official MLB Stats API,
  never re-hosted. Every card links out to an MLB.com page (recap / video / gameday); no raw
  video or image assets are stored or served. All media © MLB.

## What's wired

Every page reads from the database:

| Page | Backed by |
|---|---|
| Home (hero counts, Latest Game, Today in History, Trending, charts) | `v_site_stats`, `games`, editorial tables |
| `/players` (filterable roster + career stats) + `/players/:id` profile | `players`, `v_player_directory`, career/season views |
| `/seasons` (team history + wins chart) + `/seasons/:year` | `team_season`, `games` |
| `/games` (full season game log, filters, decisions, running record) + `/games/:gamePk` | `games`, `game_linescore`, `batting/pitching_stats` |
| `/leaders` (career + season leaderboards, directional bars) | `mv_career_*_leaders`, season views |
| `/postseason` (tiered, championship highlights) + `/postseason/:year` | `v_postseason_series`, `games` |
| `/media` (archive with type filters; links out to MLB.com) | `media_items` |
| `/lab` (compare 2–4 players' careers) | career batting/pitching views |
| Sign in (Google / email magic link) + account menu | `users`, `accounts`, `sessions` (Auth.js) |
| Discussion (comment threads on game / player / season pages) | `comments` |

## Schema & database roles

The schema is split into files by **who owns the data**, so privileges can be granted
per domain rather than all-or-nothing:

| File | Creates | Owned/written by |
|---|---|---|
| `schema.sql` | Auto-data tables: `games`, `players`, `batting_stats`, `pitching_stats`, `team_season`, `game_linescore` (+ `media_items`) | the pipeline |
| `schema_editorial.sql` | Editorial tables: `today_in_history`, `trending` | a human editor |
| `schema_app.sql` | User-generated tables: `users`, `accounts`, `sessions`, `verification_token` (Auth.js), `comments` — **and** the `mets_app` role | the web app |
| `views.sql` | Read-only views + materialized leaderboard caches | derived (no owner) |
| `roles.sql` | The `mets_pipeline` / `mets_web` / `mets_editor` roles + their grants | run once as superuser |

### Four least-privilege roles

Privilege isolation is a **mechanism, not a convention** — the grants are enforced by
Postgres, so a buggy or compromised component physically cannot write outside its domain:

| Role | Can read | Can write | Connect as |
|---|---|---|---|
| `mets_pipeline` | auto-data tables | auto-data tables **only** | the daily ingest job |
| `mets_editor` | editorial tables | editorial tables **only** | one-off editorial seeding |
| `mets_web` | everything | nothing (read-only) | — |
| `mets_app` | everything (stats + views) | the user/comments tables **only** | the Next.js web app |

Two design details make this airtight:

- **Grants list tables explicitly**, never `GRANT ... ON ALL TABLES`. A blanket grant
  would sweep editorial and user tables into the pipeline's permissions; listing each
  table by name means `mets_pipeline` is *never* granted write on editorial or user
  content. So a daily automated run cannot overwrite human-curated prose or user comments.
- **`mets_app` is a superset of `mets_web`**: it can `SELECT` everything (to render every
  page) but `INSERT/UPDATE/DELETE` only the five user-generated tables. It can read stats
  but never write them. It is created inside `schema_app.sql` (rather than `roles.sql`)
  because its grants depend on the user tables existing first.

For local development against a superuser `DATABASE_URL`, the roles are optional — they're
a production hardening step. In production, give each service its own role-scoped
`DATABASE_URL` (see [DEPLOY.md](DEPLOY.md)).

## Quick start

### 0. PostgreSQL (shared by both parts)

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb ultimate_mets
export DATABASE_URL=postgresql://localhost:5432/ultimate_mets
```

### 1. Data pipeline

```bash
cd data-pipeline
pip install -r requirements.txt
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f schema_editorial.sql
psql "$DATABASE_URL" -f schema_app.sql      # accounts + comments + mets_app role
psql "$DATABASE_URL" -f views.sql
# Optional hardening — create the mets_pipeline/mets_web/mets_editor roles and lock
# down privileges (run once as a superuser, after the tables/views above exist).
# Not needed for local dev against a superuser DATABASE_URL; recommended in production.
psql "$DATABASE_URL" -f roles.sql

# Full-history backfill (idempotent — safe to re-run). See data-pipeline/README.md.
python3 ingest_standings.py   --start-season 1962 --end-season 2026
python3 ingest_games.py       --start 1962-01-01 --end 2026-12-31
python3 ingest_boxscores.py   --start-season 1962 --end-season 2026
python3 ingest_linescores.py  --season 2026   # per-inning runs (recent games carry linescores)
python3 ingest_players.py     --start-season 1962 --end-season 2026
python3 ingest_media.py
python3 seed_editorial.py
# ...then ./run_daily.sh keeps it current each day.
```

### 2. Web app

```bash
cd web
npm install
cp .env.local.example .env.local   # or create it (see below)
npm run dev                          # http://localhost:3000
```

`.env.local`:

```bash
DATABASE_URL=postgresql://localhost:5432/ultimate_mets

# Auth.js — sign in & discussion
AUTH_SECRET=          # `openssl rand -base64 32`
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=       # Google Cloud OAuth client (redirect: /api/auth/callback/google)
AUTH_GOOGLE_SECRET=
AUTH_RESEND_KEY=      # Resend API key for email magic links
AUTH_EMAIL_FROM=onboarding@resend.dev
```

Sign-in and comments require the Auth keys above; everything else works without them. If the
database is empty or unavailable, the site still renders — data-backed sections return empty
rather than crashing.

See [web/README.md](web/README.md) and [data-pipeline/README.md](data-pipeline/README.md)
for details, and [DEPLOY.md](DEPLOY.md) for Google Cloud deployment.

## Keeping it updated (automation)

`data-pipeline/run_daily.sh` is the daily orchestrator: it runs every ingest stage in
dependency order (games → boxscores → linescores → media → players → standings) and then
refreshes the leaderboard materialized views. It is:

- **Idempotent** — `INSERT ... ON CONFLICT DO UPDATE`, safe to re-run.
- **Incremental** — fetches only recent games/finals, so a daily run takes seconds.
- **Resilient** — a single stage failing (e.g. a transient API timeout) is logged but does
  **not** abort the rest; `api_get` also retries transient network errors with backoff.
  The script exits non-zero if any stage failed, so a scheduler can alert on it.

Two ways to run it on a schedule:

**Local (macOS/Linux) — cron.** `data-pipeline/cron_daily.sh` wraps `run_daily.sh` with an
explicit `PATH` + `DATABASE_URL` (cron has a minimal environment) and logs each run to
`data-pipeline/logs/daily-YYYY-MM.log`. Install with:

```bash
crontab -e
#  run daily at 08:00 local (any time works — format is: min hour day month weekday):
0 8 * * * "/ABSOLUTE/PATH/TO/data-pipeline/cron_daily.sh"
```

> **macOS gotcha:** if the project lives under `~/Desktop`, `~/Documents`, etc., the cron
> daemon is blocked by the OS privacy layer (TCC) and the job silently won't run. Fix:
> **System Settings → Privacy & Security → Full Disk Access → add `/usr/sbin/cron`.**
> Verify a run happened by tailing the log. (`launchd` is an alternative with the same
> requirement.)

**Production — Cloud Scheduler.** The pipeline is containerized (`data-pipeline/Dockerfile`,
`CMD bash run_daily.sh`) and deployed as a Cloud Run **Job**, triggered daily by Cloud
Scheduler. See [DEPLOY.md](DEPLOY.md).

A separate one-off `backfill_history.sh` loads the full 1962–2026 box-score history (~10k API
calls) and is **not** part of the daily schedule.

## Tech stack

| Layer | Tech |
|---|---|
| Front-end / API | Next.js 16 (App Router), React 19, TypeScript |
| Charts | Chart.js |
| Auth | Auth.js (NextAuth v5) — Google OAuth + email magic link (Resend), `@auth/pg-adapter` |
| Database | PostgreSQL — web reads/writes via `pg`, pipeline writes via `psycopg2` |
| Data pipeline | Python 3 (`urllib` for fetch, `psycopg2` for load) |
| Deploy | Docker → Cloud Run (web + pipeline job), Cloud SQL, Cloud Scheduler |

Data source is the official **MLB Stats API** only (free, no key). Baseball-Reference is
used solely as a design reference, never scraped.
