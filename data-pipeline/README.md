# Ultimate Mets Data Pipeline (PostgreSQL)

Python ETL that ingests official MLB Stats API data into PostgreSQL. Each loader does
three things: **fetch** (MLB API) → **transform** (JSON → rows) → **load** (idempotent
`INSERT ... ON CONFLICT DO UPDATE`). A scheduler runs it daily.

Data source is the MLB Stats API only (free, no key). Baseball-Reference is never scraped.

## Files

### SQL
| File | Purpose |
|---|---|
| `schema.sql` | Auto-data tables: `games`, `players`, `batting_stats`, `pitching_stats`, `team_season`, `game_linescore`. |
| `schema_editorial.sql` | Human-curated tables: `today_in_history`, `trending`, `media_items`. |
| `views.sql` | Aggregation **views** + materialized leaderboards (career/season totals, leaders, site counts, postseason series, player directory). |
| `roles.sql` | DB roles + privilege isolation (run once as superuser). |

### Ingest scripts (Python)
| Script | Source → table |
|---|---|
| `ingest_games.py` | `/schedule` → `games` (incl. postseason series fields) |
| `ingest_boxscores.py` | `/game/{pk}/boxscore` → `batting_stats`, `pitching_stats` |
| `ingest_linescores.py` | `/game/{pk}/linescore` → `game_linescore` |
| `ingest_players.py` | rosters + `/people` → `players` |
| `ingest_standings.py` | `/standings` → `team_season` |
| `seed_editorial.py` | seed data → editorial tables (manual / occasional) |
| `_common.py` | shared API-fetch + Postgres-connect helpers |
| `run_daily.sh` | runs all stat loaders in order, then refreshes materialized views |
| `Dockerfile` | container for a Cloud Run Job (see ../docs/DEPLOY.md) |

## 1. Set up Postgres

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb ultimate_mets
export DATABASE_URL=postgresql://localhost:5432/ultimate_mets

pip install -r requirements.txt
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f schema_editorial.sql
psql "$DATABASE_URL" -f views.sql
```

## 2. Ingest (order matters — boxscores/linescores depend on games)

```bash
# Backfill seasons (adjust the range). Spring-training games are ingested but
# excluded from all stats by the views (they filter game_type = 'R').
python3 ingest_games.py     --start 2024-03-01 --end 2026-06-16
python3 ingest_boxscores.py --season 2024 && python3 ingest_boxscores.py --season 2025 && python3 ingest_boxscores.py --season 2026
python3 ingest_linescores.py --season 2026
python3 ingest_standings.py --start-season 2015 --end-season 2026
python3 ingest_players.py   --start-season 2024 --end-season 2026
python3 seed_editorial.py                                 # editorial content (one-time)

# Refresh the leaderboard caches
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW mv_career_batting_leaders; REFRESH MATERIALIZED VIEW mv_career_pitching_leaders;"
```

Every loader is idempotent — re-running or backfilling never creates duplicate rows.

## 3. Daily run + scheduling

`run_daily.sh` runs games → boxscores → linescores → players → standings, then refreshes
the materialized views:

```bash
DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh
```

Cron (3 AM Eastern, after West Coast night games finish):

```cron
0 3 * * * cd ".../data-pipeline" && DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh >> ingest.log 2>&1
```

(`seed_editorial.py` is NOT part of the daily run — editorial content is curated by hand.)

## 4. Design

- **Single source of truth.** `views.sql` derives all season/career totals, rate stats
  (AVG/OBP/SLG, ERA/WHIP), site counts, postseason series, and the player directory
  from the raw per-game tables. Nothing aggregated is stored.
  - Innings are stored as text (`'5.2'`) and as `outs` (17) so ERA/WHIP sum correctly;
    season IP is re-rendered in baseball notation.
  - All user-facing stats filter `game_type = 'R'` (spring training stays out).
- **Materialized leaderboards.** `mv_career_*_leaders` cache career totals for fast
  leaderboards; `run_daily.sh` refreshes them after each load. A performance cache, not
  a second source of truth.
- **Privilege isolation (`roles.sql`).** `mets_pipeline` writes only the auto-data
  tables; `mets_web` is read-only; `mets_editor` owns the editorial tables. The pipeline
  role is never granted on editorial tables, so an automated run can't overwrite
  human-entered content — enforced by Postgres, not convention.
- **"Today in History" auto skeleton.** The home page combines hand-written blurbs
  (`today_in_history`) with game results derived live from the `games` table for the
  current date — so the event skeleton is automatic, only the prose is manual.

## 5. Cloud

Point `DATABASE_URL` at managed Postgres (Cloud SQL/RDS/Neon/…) and run the pipeline as
a Cloud Run Job on a Cloud Scheduler trigger. See [../docs/DEPLOY.md](../docs/DEPLOY.md).
