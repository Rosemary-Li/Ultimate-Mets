# Ultimate Mets Data Pipeline (Phase 1: Game-level)

After each day's games end, a script automatically does three things: pull data from
the official MLB API → parse it into the table schema → idempotently write it to the
database. A scheduler triggers the script daily.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | DDL for the `games` table. Primary key `game_pk` (MLB's unique per-game ID — the basis for dedup). |
| `ingest_games.py` | The fetch → transform → load script. Uses the Python standard library only. |
| `mets.db` | SQLite database file (created automatically on first run). |

## 1. Run locally first

No `pip install` needed — the script uses only the standard library (`urllib` + `sqlite3`):

```bash
cd data-pipeline

# Default: backfill the last 3 days
python3 ingest_games.py

# Explicit date range (use this for the initial historical backfill)
python3 ingest_games.py --start 2024-04-01 --end 2024-10-01

# Inspect the data
sqlite3 -header -column mets.db "SELECT official_date, away_team_name, away_score, home_team_name, home_score, status FROM games ORDER BY official_date;"
```

## 2. Two key design points

- **Idempotent writes**: `INSERT ... ON CONFLICT(game_pk) DO UPDATE`. New games are
  inserted; existing games have their score and status updated. The script can be
  re-run or backfilled any number of times without ever creating duplicate rows.
- **Default backfill window is the last 3 days** (not just "yesterday"): this
  automatically covers state changes from double-headers, rain-outs/postponements,
  and post-game stat corrections.

## 3. Add scheduled triggering (cron, local dev stage)

Run once daily at 3 AM Eastern (ensures even West Coast night games have finished).
Edit your crontab:

```bash
crontab -e
```

Add one line (use absolute paths to the script and database):

```cron
0 3 * * * cd "/Users/rosemary/Desktop/Ultimate Mets/Ultimate Mets/data-pipeline" && /usr/bin/python3 ingest_games.py >> ingest.log 2>&1
```

- `>> ingest.log 2>&1` writes both normal logs and error stack traces to `ingest.log`
  for easy debugging/alerting.
- Run `which python3` to confirm your Python path and replace `/usr/bin/python3` above.

Verify it's registered: `crontab -l`.

> Note: cron uses your **machine's local timezone**. Convert "3 AM Eastern" to your
> machine's timezone accordingly.

## 4. Deploying to production later

The script itself does not change — just swap the trigger for a server cron job,
GitHub Actions, or a cloud scheduler.

Migrating the database from SQLite to PostgreSQL is also nearly painless:
- The UPSERT syntax (`ON CONFLICT ... DO UPDATE`) is identical on both engines.
- The only changes are the connection setup, the parameter placeholder (`?` → `%s`),
  and the two type adjustments noted in the comment at the top of `schema.sql`.

## 5. Next extension (player-level granularity)

To reach Baseball-Reference-style player-level data, the next step is to also call the
`/game/{game_pk}/boxscore` endpoint and split out two tables, `batting_stats` and
`pitching_stats`, deduped on a composite `(game_pk, player_id)` primary key.

Do **not** store player season/career totals or team standings as separate tables;
instead compute them on the fly from the raw boxscore data via SQL aggregation queries,
to avoid data inconsistency.
