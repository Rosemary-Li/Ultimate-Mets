#!/usr/bin/env bash
# Daily ingest: run every stage in dependency order, then refresh the materialized
# views. Point DATABASE_URL at your Postgres first. Safe to re-run (idempotent).
#
#   DATABASE_URL=postgresql://localhost:5432/ultimate_mets ./run_daily.sh
#
# Resilient by design: a single stage failing (e.g. a transient API timeout) is
# logged but does NOT abort the rest of the run. Exit code is non-zero if any
# stage failed, so a scheduler can alert on it.
set -uo pipefail
cd "$(dirname "$0")"

: "${DATABASE_URL:?Set DATABASE_URL, e.g. postgresql://localhost:5432/ultimate_mets}"

fail=0
stage() {
  local name="$1"; shift
  echo ">> $name"
  if ! "$@"; then
    echo "   !! $name failed — continuing"
    fail=1
  fi
}

stage games       python3 ingest_games.py        # schedule + scores for recent games
stage boxscores   python3 ingest_boxscores.py     # batting/pitching for recent finals
stage linescores  python3 ingest_linescores.py    # per-inning runs for recent finals
stage media       python3 ingest_media.py         # highlight/recap links (MLB.com)
stage players     python3 ingest_players.py        # current-season roster + bios
stage standings   python3 ingest_standings.py      # current-season standings line
stage photos      python3 ingest_player_photos.py  # resolve photos for any new players (NULL photo_url only)

echo ">> refresh leaderboards"
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_career_batting_leaders;"  || fail=1
psql "$DATABASE_URL" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_career_pitching_leaders;" || fail=1

if [ "$fail" -eq 0 ]; then
  echo ">> done (all stages ok)"
else
  echo ">> done WITH ERRORS — see log above"
fi
exit "$fail"
