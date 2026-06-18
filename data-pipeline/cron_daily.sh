#!/bin/bash
# Cron wrapper for the daily ingest.
#
# cron runs with a minimal environment (no Homebrew/Python on PATH, no
# DATABASE_URL), so we set everything explicitly here and log every run.
# Installed via crontab; see the bottom of this file for the entry.

export PATH="/opt/homebrew/bin:/Library/Frameworks/Python.framework/Versions/3.12/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export DATABASE_URL="postgresql://localhost:5432/ultimate_mets"

DIR="/Users/rosemary/Code/ultimate-mets/data-pipeline"
LOGDIR="$DIR/logs"
mkdir -p "$LOGDIR"
cd "$DIR" || exit 1

LOG="$LOGDIR/daily-$(date '+%Y-%m').log"
{
  echo "===== run_daily start $(date '+%Y-%m-%d %H:%M:%S %Z') ====="
  bash run_daily.sh
  rc=$?
  echo "===== run_daily end   $(date '+%Y-%m-%d %H:%M:%S %Z') (exit $rc) ====="
  echo
} >> "$LOG" 2>&1

# ── crontab entry (runs daily at 08:00 local) ──────────────────────────────
#   0 8 * * * "/Users/rosemary/Code/ultimate-mets/data-pipeline/cron_daily.sh"
