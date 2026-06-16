#!/usr/bin/env python3
"""Ingest per-inning linescores from /game/{game_pk}/linescore into game_linescore.

Reads finished games from the games table for a date range (or season) and upserts
one row per inning (away/home runs, hits, errors). Run after ingest_games.py.

Examples:
  python3 ingest_linescores.py                       # games in the last 3 days
  python3 ingest_linescores.py --start 2024-07-01 --end 2024-07-31
  python3 ingest_linescores.py --season 2026
"""
import argparse
import datetime as dt
import logging
import sys

from psycopg2.extras import execute_values

from _common import api_get, connect, safe_dsn, DEFAULT_DSN

log = logging.getLogger("ingest_linescores")

COLUMNS = [
    "game_pk", "inning_num", "away_runs", "home_runs",
    "away_hits", "home_hits", "away_errors", "home_errors",
]


def games_to_process(conn, start, end, season):
    with conn.cursor() as cur:
        if season is not None:
            cur.execute(
                "SELECT game_pk FROM games WHERE status_code='F' AND season=%s "
                "ORDER BY official_date",
                (season,),
            )
        else:
            cur.execute(
                "SELECT game_pk FROM games WHERE status_code='F' "
                "AND official_date BETWEEN %s AND %s ORDER BY official_date",
                (start, end),
            )
        return [r[0] for r in cur.fetchall()]


def parse_linescore(ls: dict, game_pk: int) -> list[dict]:
    rows = []
    for inn in ls.get("innings", []):
        away, home = inn.get("away", {}), inn.get("home", {})
        rows.append({
            "game_pk": game_pk,
            "inning_num": inn.get("num"),
            "away_runs": away.get("runs"), "home_runs": home.get("runs"),
            "away_hits": away.get("hits"), "home_hits": home.get("hits"),
            "away_errors": away.get("errors"), "home_errors": home.get("errors"),
        })
    return rows


def upsert(conn, rows: list[dict]) -> int:
    if not rows:
        return 0
    cols = ", ".join(COLUMNS)
    updates = ", ".join(
        f"{c} = EXCLUDED.{c}" for c in COLUMNS if c not in ("game_pk", "inning_num")
    )
    sql = (
        f"INSERT INTO game_linescore ({cols}, updated_at) VALUES %s "
        f"ON CONFLICT (game_pk, inning_num) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(COLUMNS)) + ", now())"
    data = [tuple(r[c] for c in COLUMNS) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest per-inning linescores")
    p.add_argument("--days", type=int, default=3)
    p.add_argument("--start")
    p.add_argument("--end")
    p.add_argument("--season", type=int)
    p.add_argument("--dsn", default=DEFAULT_DSN, help="Postgres DSN (default: $DATABASE_URL)")
    a = p.parse_args(argv)
    end = dt.date.fromisoformat(a.end) if a.end else dt.date.today()
    start = dt.date.fromisoformat(a.start) if a.start else end - dt.timedelta(days=a.days - 1)
    return start.isoformat(), end.isoformat(), a.season, a.dsn


def main(argv=None) -> int:
    start, end, season, dsn = parse_args(argv)
    scope = f"season {season}" if season else f"{start} ~ {end}"
    log.info("Ingesting linescores for %s -> %s", scope, safe_dsn(dsn))
    conn = None
    try:
        conn = connect(dsn)
        pks = games_to_process(conn, start, end, season)
        log.info("%d finished games to process", len(pks))
        total = 0
        for game_pk in pks:
            ls = api_get(f"game/{game_pk}/linescore")
            total += upsert(conn, parse_linescore(ls, game_pk))
        log.info("Done: %d inning rows", total)
        return 0
    except Exception:
        log.exception("Linescore ingestion failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
