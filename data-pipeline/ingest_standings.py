#!/usr/bin/env python3
"""Ingest Mets end-of-season standings into team_season.

For each season it pulls the NL standings (/standings?leagueId=104), finds the Mets'
record, and idempotently upserts one row per season.

Examples:
  python3 ingest_standings.py                          # current season
  python3 ingest_standings.py --season 2024
  python3 ingest_standings.py --start-season 1969 --end-season 2025
"""
import argparse
import datetime as dt
import logging
import sys

from psycopg2.extras import execute_values

from _common import METS_TEAM_ID, api_get, connect, safe_dsn, DEFAULT_DSN

log = logging.getLogger("ingest_standings")

NL_LEAGUE_ID = 104

COLUMNS = [
    "season", "team_id", "wins", "losses", "win_pct", "games_back",
    "division_id", "division_rank", "league_rank", "runs_scored",
    "runs_allowed", "run_diff", "streak",
]


def fetch_mets_record(season: int) -> dict | None:
    data = api_get("standings", leagueId=NL_LEAGUE_ID, season=season, standingsTypes="regularSeason")
    for div in data.get("records", []):
        division_id = (div.get("division") or {}).get("id")
        for tr in div.get("teamRecords", []):
            if tr["team"]["id"] == METS_TEAM_ID:
                rs = tr.get("runsScored")
                ra = tr.get("runsAllowed")
                return {
                    "season": season,
                    "team_id": METS_TEAM_ID,
                    "wins": tr.get("wins"),
                    "losses": tr.get("losses"),
                    "win_pct": tr.get("winningPercentage"),
                    "games_back": tr.get("gamesBack"),
                    "division_id": division_id,
                    "division_rank": tr.get("divisionRank"),
                    "league_rank": tr.get("leagueRank"),
                    "runs_scored": rs,
                    "runs_allowed": ra,
                    "run_diff": (rs - ra) if rs is not None and ra is not None else None,
                    "streak": (tr.get("streak") or {}).get("streakCode"),
                }
    return None


def upsert(conn, rows: list[dict]) -> int:
    if not rows:
        return 0
    cols = ", ".join(COLUMNS)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "season")
    sql = (
        f"INSERT INTO team_season ({cols}, updated_at) VALUES %s "
        f"ON CONFLICT (season) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(COLUMNS)) + ", now())"
    data = [tuple(r[c] for c in COLUMNS) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest Mets season standings into PostgreSQL")
    p.add_argument("--season", type=int, help="A single season (default: current year)")
    p.add_argument("--start-season", type=int, help="Range start (with --end-season)")
    p.add_argument("--end-season", type=int, help="Range end")
    p.add_argument("--dsn", default=DEFAULT_DSN, help="Postgres DSN (default: $DATABASE_URL)")
    a = p.parse_args(argv)
    if a.start_season and a.end_season:
        seasons = list(range(a.start_season, a.end_season + 1))
    elif a.season:
        seasons = [a.season]
    else:
        seasons = [dt.date.today().year]
    return seasons, a.dsn


def main(argv=None) -> int:
    seasons, dsn = parse_args(argv)
    log.info("Ingesting standings for %d season(s) -> %s", len(seasons), safe_dsn(dsn))
    conn = None
    try:
        rows = []
        for s in seasons:
            rec = fetch_mets_record(s)
            if rec:
                rows.append(rec)
            else:
                log.warning("No Mets standings row for %s (team may not have existed)", s)
        conn = connect(dsn)
        n = upsert(conn, rows)
        log.info("Done: wrote/updated %d seasons", n)
        return 0
    except Exception:
        log.exception("Standings ingestion failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
