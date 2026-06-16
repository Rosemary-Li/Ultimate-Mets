# Ultimate Mets Data Pipeline (PostgreSQL)

Python ETL that ingests official MLB Stats API data into PostgreSQL. Each loader does
three things: **fetch** (MLB API) → **transform** (JSON → rows) → **load** (idempotent
`INSERT ... ON CONFLICT DO UPDATE`). A scheduler runs it daily.

Data source is the MLB Stats API only (free, no key). Baseball-Reference is never scraped.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | DDL — auto-data tables: `games`, `players`, `batting_stats`, `pitching_stats`. |
| `views.sql` | Aggregation **views** (season/career totals, site counts). Derived, not stored. |
| `roles.sql` | DB roles + privilege isolation (run once as superuser). |
| `ingest_games.py` | Game-level rows from `/schedule` (Mets, team id 121). |
| `ingest_boxscores.py` | Per-game batting/pitching from `/game/{pk}/boxscore`. |
| `ingest_players.py` | Player bios from rosters + `/people`. |
| `run_daily.sh` | Runs all loaders in dependency order, then refreshes materialized views. |
| `_common.py` | Shared API-fetch + Postgres-connect helpers. |
| `requirements.txt` | `psycopg2-binary`. |

## Connection

All scripts read the connection from `DATABASE_URL` (a libpq connection string) or the
`--dsn` flag. Local default: `postgresql://localhost:5432/ultimate_mets`.

## 1. Set up Postgres

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb ultimate_mets
export DATABASE_URL=postgresql://localhost:5432/ultimate_mets

pip install -r requirements.txt
psql "$DATABASE_URL" -f schema.sql      # create tables
psql "$DATABASE_URL" -f views.sql       # create aggregation views
```

## 2. Ingest (run in this order — boxscores depend on games)

```bash
python3 ingest_games.py                              # last 3 days (default)
python3 ingest_games.py     --start 2024-03-28 --end 2024-09-30
python3 ingest_boxscores.py --season 2024            # batting/pitching for finished games
python3 ingest_players.py   --start-season 2015 --end-season 2025

# Inspect
psql "$DATABASE_URL" -c "SELECT * FROM v_site_stats;"
psql "$DATABASE_URL" -c "SELECT pl.full_name, b.season, b.home_runs, b.avg
  FROM v_player_season_batting b JOIN players pl USING (player_id)
  ORDER BY b.home_runs DESC LIMIT 10;"
```

Every loader is idempotent — re-running or backfilling never creates duplicate rows.
`ingest_games` and `ingest_boxscores` backfill the last 3 days by default, which
absorbs double-headers, postponements, and post-game stat corrections.

## 3. Daily run + scheduling

`run_daily.sh` runs all stages in order:

```bash
DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh
```

Schedule it once a day at 3 AM Eastern (after West Coast night games finish):

```cron
0 3 * * * cd "/Users/rosemary/Desktop/Ultimate Mets/Ultimate Mets/data-pipeline" && DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh >> ingest.log 2>&1
```

cron uses your machine's local timezone.

## 4. Design

- **Single source of truth.** `views.sql` computes season/career totals, rate stats
  (AVG/OBP/SLG, ERA/WHIP), and the home-page counts (`v_site_stats`) from the raw
  per-game tables. Nothing aggregated is stored.
  - Innings are stored two ways: `innings_pitched` text (`'5.2'`, as MLB returns it)
    and `outs` integer (17), so ERA/WHIP sum correctly. Season IP is re-rendered in
    baseball notation (`'12.1'` = 12⅓).
- **Materialized views for heavy leaderboards.** When an all-time leaderboard gets slow,
  promote it to a `MATERIALIZED VIEW` and `REFRESH` it at the end of `run_daily.sh`.
  See the template at the bottom of `views.sql`. It's a performance cache, not a second
  source of truth.
- **Privilege isolation (`roles.sql`).** Run once as a superuser after editing the
  passwords. Creates:
  - `mets_pipeline` — write only on auto-data tables (games/players/batting/pitching/standings).
  - `mets_web` — read-only on everything.
  - `mets_editor` — owns editorial tables; the pipeline role is never granted on them,
    so an automated run cannot overwrite human-entered content.

## 5. Going to the cloud

The scripts don't change — point `DATABASE_URL` at the managed Postgres (RDS, Cloud SQL,
Neon, Supabase, …) and swap the cron trigger for the server's cron / GitHub Actions /
a cloud scheduler. Use `psycopg2` (compiled against libpq) instead of `psycopg2-binary`
in production if you prefer.

## 6. Next extension

Standings (`/standings`) for season pages, then leaderboards as materialized views, then
postseason. Editorial tables (media, today_in_history, trending) get their own schema
and stay outside the pipeline's write scope. "Today in History" can auto-generate its
event skeleton from the `games` table, with humans adding only the narrative text.
