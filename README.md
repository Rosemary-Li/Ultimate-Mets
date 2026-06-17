# Ultimate Mets Database

A New York Mets stats and history site: a full-stack web app backed by a data
pipeline that ingests live data from the official MLB Stats API into PostgreSQL,
updated daily. Every player, season, game, and postseason moment — searchable,
comparable, and connected.

## Architecture

```
MLB Stats API ──► data-pipeline (Python) ──► PostgreSQL ──► web (Next.js API + UI)
```

```
.
├── web/             Next.js (App Router, TypeScript) front-end + back-end
├── data-pipeline/   Python ETL that ingests MLB data into PostgreSQL (daily)
└── DEPLOY.md        Google Cloud deployment guide
```

The two parts share one PostgreSQL database: the pipeline writes it, the web app reads
it. Every page is wired to real data. Coverage:

- **Year-by-year standings & postseason: all 65 seasons (1962–2026)** — the full
  franchise history (record, finish, R/RA, every playoff series).
- **Full game data, box scores, player stats, leaderboards: 2024–2026** (+ all
  postseason games) — backfill earlier seasons by running the game/boxscore ingest
  over older date ranges.

### Design principles

- **Single source of truth.** Career/season totals, leaderboards, postseason series, and
  the home-page counts are computed from raw per-game rows via SQL **views**, never
  stored. Heavy career leaderboards are cached as **materialized views** (refreshed after
  each daily load — a performance cache, not a second source of truth).
- **Privilege isolation.** Three database roles (`data-pipeline/roles.sql`):
  `mets_pipeline` writes only the auto-data tables, `mets_web` is read-only, `mets_editor`
  owns the editorial tables. The pipeline can never write editorial content — enforced by
  Postgres, not by convention.
- **Idempotent ingestion.** Every loader uses `INSERT ... ON CONFLICT DO UPDATE`, so
  daily/backfill runs never create duplicates.
- **Auto vs. editorial.** Stats come from the MLB API daily. Editorial content (media
  archive, "Today in History" prose, Trending) is human-curated; "Today in History" still
  derives its game-result skeleton automatically from the `games` table.

## What's wired

Every page reads from the database:

| Page | Backed by |
|---|---|
| Home (hero counts, Latest Games, Today in History, Trending) | `v_site_stats`, `games`, editorial tables |
| `/players` (roster split current/historical) + `/players/:id` profile | `players`, `v_player_directory`, season views |
| `/seasons` + `/seasons/:year` (record, standings, game log) | `team_season`, `games` |
| `/games` + `/games/:gamePk` (linescore + box score) | `games`, `game_linescore`, `batting/pitching_stats` |
| `/leaders` (career + season leaderboards) | `mv_career_*_leaders`, season views |
| `/postseason` + `/postseason/:year` (series + results) | `v_postseason_series`, `games` |
| `/media` (archive with filters) | `media_items` |
| `/lab` (compare 2–4 players' careers) | `mv_career_batting_leaders` |

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
psql "$DATABASE_URL" -f views.sql

# Backfill (idempotent — safe to re-run). See data-pipeline/README.md for the full set.
python3 ingest_games.py     --start 2024-03-01 --end 2026-06-16
python3 ingest_boxscores.py --season 2026
python3 ingest_standings.py --start-season 2015 --end-season 2026
python3 ingest_players.py   --start-season 2024 --end-season 2026
python3 seed_editorial.py
# ...then ./run_daily.sh keeps it current each day.
```

### 2. Web app

```bash
cd web
npm install
echo "DATABASE_URL=postgresql://localhost:5432/ultimate_mets" > .env.local
npm run dev            # http://localhost:3000
```

If the database is empty or unavailable, the site still renders — data-backed sections
return empty rather than crashing.

See [web/README.md](web/README.md) and [data-pipeline/README.md](data-pipeline/README.md)
for details, and [DEPLOY.md](DEPLOY.md) for Google Cloud deployment.

## Tech stack

| Layer | Tech |
|---|---|
| Front-end / API | Next.js 16 (App Router), React 19, TypeScript |
| Database | PostgreSQL — web reads via `pg`, pipeline writes via `psycopg2` |
| Data pipeline | Python 3 (`urllib` for fetch, `psycopg2` for load) |
| Deploy | Docker → Cloud Run (web + pipeline job), Cloud SQL, Cloud Scheduler |

Data source is the official **MLB Stats API** only (free, no key). Baseball-Reference is
used solely as a design reference, never scraped.
