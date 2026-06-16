#!/usr/bin/env python3
"""Ultimate Mets — game-level ingestion script (Phase 1, PostgreSQL).

Pipeline: fetch (MLB official /schedule API) -> transform (JSON -> rows)
          -> load (idempotent UPSERT into Postgres by game_pk).

Backfills the last 3 days by default, automatically covering double-headers,
rain-outs/postponements, and post-game stat corrections. The script is idempotent:
it can be re-run or backfilled any number of times without creating duplicate rows.

Connection comes from the DATABASE_URL env var (libpq connection string), or --dsn.
Requires psycopg2 (see requirements.txt).
Run with:  DATABASE_URL=postgresql://localhost:5432/ultimate_mets python3 ingest_games.py
"""
import argparse
import datetime as dt
import json
import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import psycopg2
from psycopg2.extras import execute_values

METS_TEAM_ID = 121          # New York Mets
SPORT_ID = 1                # MLB
API_BASE = "https://statsapi.mlb.com/api/v1"

HERE = Path(__file__).parent
SCHEMA_PATH = HERE / "schema.sql"
DEFAULT_DSN = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/ultimate_mets")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ingest_games")

# Table columns (mirror schema.sql; updated_at is written by SQL, not listed here).
COLUMNS = [
    "game_pk", "official_date", "game_datetime", "season", "game_type",
    "status", "status_code", "double_header", "game_number",
    "home_team_id", "home_team_name", "home_score", "home_is_winner",
    "away_team_id", "away_team_name", "away_score", "away_is_winner",
    "venue_id", "venue_name", "mets_is_home",
]


# ------------------------------------------------------------------ fetch
def fetch_schedule(start_date: str, end_date: str) -> dict:
    """Call the /schedule endpoint for the Mets team id over a date range."""
    params = urlencode({
        "sportId": SPORT_ID,
        "teamId": METS_TEAM_ID,
        "startDate": start_date,
        "endDate": end_date,
        "hydrate": "team,venue,linescore",
    })
    url = f"{API_BASE}/schedule?{params}"
    log.info("GET %s", url)
    req = Request(url, headers={"User-Agent": "ultimate-mets-ingest/1.0"})
    with urlopen(req, timeout=30) as resp:
        return json.load(resp)


# -------------------------------------------------------------- transform
def transform(payload: dict) -> list[dict]:
    """Flatten the schedule JSON into rows matching the table columns.

    Deduplicates by game_pk: the schedule can list the same game under more than
    one date (suspended/resumed games), and a single UPSERT can't touch the same
    primary key twice. Keep the last occurrence.
    """
    by_pk: dict[int, dict] = {}
    for date in payload.get("dates", []):
        for g in date.get("games", []):
            teams = g.get("teams", {})
            home, away = teams.get("home", {}), teams.get("away", {})
            home_team, away_team = home.get("team", {}), away.get("team", {})
            venue = g.get("venue", {})
            status = g.get("status", {})
            by_pk[g["gamePk"]] = {
                "game_pk": g["gamePk"],
                "official_date": g.get("officialDate"),
                "game_datetime": g.get("gameDate"),
                "season": int(g["season"]) if g.get("season") else None,
                "game_type": g.get("gameType"),
                "status": status.get("detailedState"),
                "status_code": status.get("statusCode"),
                "double_header": g.get("doubleHeader"),
                "game_number": g.get("gameNumber"),
                "home_team_id": home_team.get("id"),
                "home_team_name": home_team.get("name"),
                "home_score": home.get("score"),
                "home_is_winner": _as_bool(home.get("isWinner")),
                "away_team_id": away_team.get("id"),
                "away_team_name": away_team.get("name"),
                "away_score": away.get("score"),
                "away_is_winner": _as_bool(away.get("isWinner")),
                "venue_id": venue.get("id"),
                "venue_name": venue.get("name"),
                "mets_is_home": 1 if home_team.get("id") == METS_TEAM_ID else 0,
            }
    return list(by_pk.values())


def _as_bool(v):
    """isWinner may be absent before a game ends; normalize to 0/1/None."""
    if v is None:
        return None
    return 1 if v else 0


# ------------------------------------------------------------------- load
def init_db(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
    conn.commit()


def load(conn, rows: list[dict]) -> int:
    """Idempotent UPSERT: insert new games, update score/status on existing ones."""
    if not rows:
        return 0
    cols = ", ".join(COLUMNS)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "game_pk")
    # updated_at is appended as a literal now() per row via the template below.
    sql = (
        f"INSERT INTO games ({cols}, updated_at) VALUES %s "
        f"ON CONFLICT (game_pk) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(COLUMNS)) + ", now())"
    data = [tuple(r[c] for c in COLUMNS) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


# ------------------------------------------------------------------- main
def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest Mets game-level data into PostgreSQL")
    p.add_argument("--days", type=int, default=3,
                   help="Backfill the last N days (default 3; covers DH/postponements/corrections)")
    p.add_argument("--start", help="Start date YYYY-MM-DD (overrides --days)")
    p.add_argument("--end", help="End date YYYY-MM-DD (defaults to today)")
    p.add_argument("--dsn", default=DEFAULT_DSN,
                   help="Postgres connection string (default: $DATABASE_URL)")
    a = p.parse_args(argv)

    end = dt.date.fromisoformat(a.end) if a.end else dt.date.today()
    start = dt.date.fromisoformat(a.start) if a.start else end - dt.timedelta(days=a.days - 1)
    return start.isoformat(), end.isoformat(), a.dsn


def main(argv=None) -> int:
    start, end, dsn = parse_args(argv)
    log.info("Backfill range %s ~ %s  ->  %s", start, end, _safe_dsn(dsn))
    conn = None
    try:
        payload = fetch_schedule(start, end)
        rows = transform(payload)
        conn = psycopg2.connect(dsn)
        init_db(conn)
        n = load(conn, rows)
        log.info("Done: wrote/updated %d games (%d returned by API)", n, len(rows))
        return 0
    except Exception:
        log.exception("Ingestion failed")   # full stack trace for debugging/alerting
        return 1
    finally:
        if conn is not None:
            conn.close()


def _safe_dsn(dsn: str) -> str:
    """Hide a password if the DSN embeds one, for log output."""
    if "@" in dsn and "//" in dsn:
        scheme, rest = dsn.split("//", 1)
        creds, host = rest.split("@", 1)
        if ":" in creds:
            user = creds.split(":", 1)[0]
            return f"{scheme}//{user}:***@{host}"
    return dsn


if __name__ == "__main__":
    sys.exit(main())
