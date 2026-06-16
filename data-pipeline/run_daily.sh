#!/usr/bin/env bash
# Daily ingest: run all stages in dependency order, then refresh any materialized
# views. Point DATABASE_URL at your Postgres first. Safe to re-run (idempotent).
#
#   DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh
set -euo pipefail
cd "$(dirname "$0")"

: "${DATABASE_URL:?Set DATABASE_URL, e.g. postgresql://localhost:5432/ultimate_mets}"

echo ">> games"      ; python3 ingest_games.py
echo ">> boxscores"  ; python3 ingest_boxscores.py        # batting/pitching for recent finals
echo ">> players"    ; python3 ingest_players.py          # current-season roster + bios

# Refresh materialized views here once they exist, e.g.:
#   psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_career_hr_leaders;"

echo ">> done"
