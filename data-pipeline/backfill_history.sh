#!/usr/bin/env bash
# One-off heavy backfill: per-game batting/pitching boxscores for every season,
# then refresh the leaderboard materialized views. ~10k API calls — run in the
# background. Idempotent (safe to re-run / resume). Requires DATABASE_URL.
set -e
cd "$(dirname "$0")"
: "${DATABASE_URL:?Set DATABASE_URL}"

for yr in $(seq 1962 2026); do
  echo ">> boxscores $yr"
  python3 ingest_boxscores.py --season "$yr" || echo "   (season $yr had an issue, continuing)"
done

echo ">> refresh leaderboards"
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW mv_career_batting_leaders;"
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW mv_career_pitching_leaders;"
echo "BACKFILL DONE"
