# Ultimate Mets Data Pipeline (Phase 1: Game-level, PostgreSQL)

After each day's games end, this script does three things: pull data from the
official MLB API → parse it into the table schema → idempotently write it to
PostgreSQL. A scheduler triggers it daily.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | DDL for the `games` table (Postgres). Primary key `game_pk` — MLB's unique per-game ID, the basis for dedup. |
| `ingest_games.py` | The fetch → transform → load script (uses `psycopg2`). |
| `requirements.txt` | Python dependency: `psycopg2-binary`. |

## Connection

The script reads the connection from the `DATABASE_URL` environment variable
(a libpq connection string), or the `--dsn` flag:

```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

For local development the default is `postgresql://localhost:5432/ultimate_mets`.

## 1. Set up a local Postgres (test here before going to the cloud)

```bash
# Install + start Postgres (macOS / Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create the database
createdb ultimate_mets
```

## 2. Install the Python dependency

```bash
cd data-pipeline
pip install -r requirements.txt
```

## 3. Run it

```bash
export DATABASE_URL=postgresql://localhost:5432/ultimate_mets

python3 ingest_games.py                                  # backfill the last 3 days
python3 ingest_games.py --start 2024-07-01 --end 2024-07-05   # an explicit range
python3 ingest_games.py --dsn postgresql://localhost:5432/ultimate_mets

# Inspect the data
psql ultimate_mets -c "SELECT official_date, away_team_name, away_score, home_team_name, home_score, status FROM games ORDER BY official_date;"
```

The script creates the `games` table automatically on first run (`CREATE TABLE IF NOT EXISTS`).

## 4. Two key design points

- **Idempotent writes**: `INSERT ... ON CONFLICT (game_pk) DO UPDATE`. New games are
  inserted; existing games have their score and status updated. Safe to re-run or
  backfill any number of times without duplicate rows. (Batched via
  `psycopg2.extras.execute_values`.)
- **Default backfill window is the last 3 days** (not just "yesterday"): automatically
  covers double-headers, postponements, and post-game stat corrections.

## 5. Schedule it (cron, local dev)

Run once daily at 3 AM Eastern (after West Coast night games finish):

```cron
0 3 * * * cd "/Users/rosemary/Desktop/Ultimate Mets/Ultimate Mets/data-pipeline" && DATABASE_URL=postgresql://localhost:5432/ultimate_mets /usr/bin/python3 ingest_games.py >> ingest.log 2>&1
```

Confirm Python's path with `which python3`. cron uses your machine's local timezone.

## 6. Going to the cloud

The script doesn't change — point `DATABASE_URL` at the managed Postgres (RDS, Cloud
SQL, Neon, Supabase, etc.) and swap the trigger for the server's cron / GitHub Actions /
a cloud scheduler. Use `psycopg2` (compiled against libpq) instead of `psycopg2-binary`
for production if you prefer.

## 7. Next extension (player-level granularity)

Add the `/game/{game_pk}/boxscore` endpoint and split out `batting_stats` and
`pitching_stats`, deduped on a composite `(game_pk, player_id)` primary key. Compute
season/career totals and standings on the fly via SQL aggregation rather than storing
them, to avoid inconsistency.
