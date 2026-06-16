#!/usr/bin/env python3
"""Ingest Mets players (roster + biographical detail) into the players table.

For each requested season it pulls the full-season roster, collects the person ids,
batch-fetches their bios from /people, and idempotently upserts them.

Idempotent: re-runnable any number of times (ON CONFLICT (player_id) DO UPDATE).

Examples:
  python3 ingest_players.py                       # current season's roster
  python3 ingest_players.py --season 2024
  python3 ingest_players.py --start-season 2015 --end-season 2025
"""
import argparse
import datetime as dt
import logging
import sys

from psycopg2.extras import execute_values

from _common import METS_TEAM_ID, api_get, connect, safe_dsn, DEFAULT_DSN

log = logging.getLogger("ingest_players")

COLUMNS = [
    "player_id", "full_name", "primary_number", "primary_position",
    "position_type", "bat_side", "pitch_hand", "birth_date", "birth_city",
    "birth_country", "height", "weight", "mlb_debut_date", "name_slug", "active",
]


def roster_person_ids(season: int) -> set[int]:
    data = api_get(f"teams/{METS_TEAM_ID}/roster", rosterType="fullSeason", season=season)
    return {e["person"]["id"] for e in data.get("roster", [])}


def fetch_bios(person_ids: list[int]) -> list[dict]:
    """Batch-fetch /people for up to ~50 ids per request."""
    rows = []
    for i in range(0, len(person_ids), 40):
        chunk = person_ids[i:i + 40]
        data = api_get("people", personIds=",".join(str(x) for x in chunk))
        for p in data.get("people", []):
            rows.append({
                "player_id": p["id"],
                "full_name": p.get("fullName"),
                "primary_number": p.get("primaryNumber"),
                "primary_position": (p.get("primaryPosition") or {}).get("abbreviation"),
                "position_type": (p.get("primaryPosition") or {}).get("type"),
                "bat_side": (p.get("batSide") or {}).get("code"),
                "pitch_hand": (p.get("pitchHand") or {}).get("code"),
                "birth_date": p.get("birthDate"),
                "birth_city": p.get("birthCity"),
                "birth_country": p.get("birthCountry"),
                "height": p.get("height"),
                "weight": p.get("weight"),
                "mlb_debut_date": p.get("mlbDebutDate"),
                "name_slug": p.get("nameSlug"),
                "active": p.get("active"),
            })
    return rows


def upsert_players(conn, rows: list[dict]) -> int:
    if not rows:
        return 0
    cols = ", ".join(COLUMNS)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "player_id")
    sql = (
        f"INSERT INTO players ({cols}, updated_at) VALUES %s "
        f"ON CONFLICT (player_id) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(COLUMNS)) + ", now())"
    data = [tuple(r[c] for c in COLUMNS) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest Mets players into PostgreSQL")
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
    log.info("Ingesting players for seasons %s -> %s", seasons, safe_dsn(dsn))
    conn = None
    try:
        ids: set[int] = set()
        for s in seasons:
            ids |= roster_person_ids(s)
        log.info("Collected %d unique person ids; fetching bios...", len(ids))
        rows = fetch_bios(sorted(ids))
        conn = connect(dsn)
        n = upsert_players(conn, rows)
        log.info("Done: wrote/updated %d players", n)
        return 0
    except Exception:
        log.exception("Player ingestion failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
