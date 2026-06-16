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
└── data-pipeline/   Python ETL that ingests MLB data into PostgreSQL (daily)
```

The two parts share one PostgreSQL database: the pipeline writes it, the web app
reads it. Statistical content (games, players, stats, leaderboards) is derived from
real data; some editorial content (media archive, "Today in History" prose, Trending)
is still illustrative placeholder data from the original prototypes.

### Design principles

- **Single source of truth.** Career/season totals, leaderboards, and the home-page
  counts are computed from raw per-game rows via SQL **views**, never stored. Heavy
  leaderboards can be promoted to **materialized views** (a refresh-on-load cache, not
  a second source of truth).
- **Privilege isolation.** Two database roles (`data-pipeline/roles.sql`): the pipeline
  can write only the auto-data tables; the web app is read-only; editorial tables are
  never writable by the pipeline. This is enforced by Postgres, not by convention.
- **Idempotent ingestion.** Every loader uses `INSERT ... ON CONFLICT DO UPDATE`, so
  daily/backfill runs never create duplicates.

## Build status

| Domain | In the database | Page wired to real data |
|---|---|---|
| Games | ✅ real | Home "Latest Games" strip ✅ · Games detail page ⬜ (still prototype) |
| Players + per-game batting/pitching | ✅ real | `/players` roster + player profiles ✅ |
| Home hero counts | ✅ real (`v_site_stats`) | ✅ |
| Seasons / Leaders / Postseason / Lab / Media | ⬜ not yet | ⬜ still illustrative |
| Editorial (Today in History, Trending, Media) | ⬜ tables not built | ⬜ still illustrative |

Roadmap order (vertical slices — each domain goes schema → pipeline → API → page
before the next): **Players ✅ → Seasons/Standings → Leaders → Postseason → Editorial.**

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
psql "$DATABASE_URL" -f schema.sql      # tables
psql "$DATABASE_URL" -f views.sql       # aggregation views

# Ingest (idempotent — safe to re-run / backfill)
python3 ingest_games.py     --start 2024-03-28 --end 2024-09-30
python3 ingest_boxscores.py --season 2024
python3 ingest_players.py   --start-season 2015 --end-season 2025

# Or run all stages in order:
./run_daily.sh
```

See [data-pipeline/README.md](data-pipeline/README.md) for the schema, the role
isolation, materialized views, and how to schedule the daily run.

### 2. Web app

```bash
cd web
npm install
echo "DATABASE_URL=postgresql://localhost:5432/ultimate_mets" > .env.local
npm run dev            # http://localhost:3000
```

If the database is empty or unavailable, the site still renders — data-backed sections
return empty and the rest falls back to illustrative content.

See [web/README.md](web/README.md) for the app structure, shared layout/navigation,
CSS scoping, and the API routes.

## Tech stack

| Layer | Tech |
|---|---|
| Front-end / API | Next.js 16 (App Router), React 19, TypeScript |
| Charts | Chart.js |
| Database | PostgreSQL — web reads via `pg`, pipeline writes via `psycopg2` |
| Data pipeline | Python 3 (`urllib` for fetch, `psycopg2` for load) |
| Scheduling | cron (local dev); swappable for GitHub Actions / cloud scheduler |

Data source is the official **MLB Stats API** only (free, no key). Baseball-Reference
is used solely as a design reference, never scraped.
