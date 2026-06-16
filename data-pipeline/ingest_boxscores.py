#!/usr/bin/env python3
"""Ingest per-game batting & pitching lines from MLB boxscores.

Reads finished games (status_code='F') from the games table for a date range,
fetches each /game/{game_pk}/boxscore, and idempotently upserts both teams'
batting and pitching lines, keyed by (game_pk, player_id).

Run this AFTER ingest_games.py (it depends on rows in the games table).

Examples:
  python3 ingest_boxscores.py                              # games in the last 3 days
  python3 ingest_boxscores.py --start 2024-07-01 --end 2024-07-05
  python3 ingest_boxscores.py --season 2024
"""
import argparse
import datetime as dt
import logging
import sys

from psycopg2.extras import execute_values

from _common import METS_TEAM_ID, api_get, connect, ip_to_outs, safe_dsn, DEFAULT_DSN

log = logging.getLogger("ingest_boxscores")

BAT_COLS = [
    "game_pk", "player_id", "team_id", "is_mets", "season", "official_date",
    "batting_order", "position", "plate_appearances", "at_bats", "runs", "hits",
    "doubles", "triples", "home_runs", "rbi", "walks", "intentional_walks",
    "strike_outs", "stolen_bases", "caught_stealing", "hit_by_pitch", "sac_flies",
    "sac_bunts", "total_bases", "left_on_base",
]
PIT_COLS = [
    "game_pk", "player_id", "team_id", "is_mets", "season", "official_date",
    "games_started", "innings_pitched", "outs", "hits", "runs", "earned_runs",
    "home_runs", "walks", "intentional_walks", "strike_outs", "hit_by_pitch",
    "wins", "losses", "saves", "number_of_pitches",
]


def games_to_process(conn, start: str, end: str, season: int | None):
    with conn.cursor() as cur:
        if season is not None:
            cur.execute(
                "SELECT game_pk, season, official_date FROM games "
                "WHERE status_code = 'F' AND season = %s ORDER BY official_date",
                (season,),
            )
        else:
            cur.execute(
                "SELECT game_pk, season, official_date FROM games "
                "WHERE status_code = 'F' AND official_date BETWEEN %s AND %s "
                "ORDER BY official_date",
                (start, end),
            )
        return cur.fetchall()


def _int(v):
    return v if isinstance(v, int) else (int(v) if v not in (None, "") else None)


def parse_boxscore(box: dict, game_pk: int, season: int, date: str):
    bat_rows, pit_rows = [], []
    for side in ("home", "away"):
        team = box["teams"][side]
        team_id = team["team"]["id"]
        is_mets = 1 if team_id == METS_TEAM_ID else 0
        for pid, pl in team["players"].items():
            player_id = pl["person"]["id"]
            stats = pl.get("stats", {})
            b = stats.get("batting") or {}
            if b:  # had a batting line this game
                bat_rows.append({
                    "game_pk": game_pk, "player_id": player_id, "team_id": team_id,
                    "is_mets": is_mets, "season": season, "official_date": date,
                    "batting_order": _int(pl.get("battingOrder")),
                    "position": (pl.get("position") or {}).get("abbreviation"),
                    "plate_appearances": b.get("plateAppearances"),
                    "at_bats": b.get("atBats"), "runs": b.get("runs"),
                    "hits": b.get("hits"), "doubles": b.get("doubles"),
                    "triples": b.get("triples"), "home_runs": b.get("homeRuns"),
                    "rbi": b.get("rbi"), "walks": b.get("baseOnBalls"),
                    "intentional_walks": b.get("intentionalWalks"),
                    "strike_outs": b.get("strikeOuts"),
                    "stolen_bases": b.get("stolenBases"),
                    "caught_stealing": b.get("caughtStealing"),
                    "hit_by_pitch": b.get("hitByPitch"),
                    "sac_flies": b.get("sacFlies"), "sac_bunts": b.get("sacBunts"),
                    "total_bases": b.get("totalBases"),
                    "left_on_base": b.get("leftOnBase"),
                })
            p = stats.get("pitching") or {}
            if p:
                pit_rows.append({
                    "game_pk": game_pk, "player_id": player_id, "team_id": team_id,
                    "is_mets": is_mets, "season": season, "official_date": date,
                    "games_started": p.get("gamesStarted"),
                    "innings_pitched": p.get("inningsPitched"),
                    "outs": ip_to_outs(p.get("inningsPitched")),
                    "hits": p.get("hits"), "runs": p.get("runs"),
                    "earned_runs": p.get("earnedRuns"), "home_runs": p.get("homeRuns"),
                    "walks": p.get("baseOnBalls"),
                    "intentional_walks": p.get("intentionalWalks"),
                    "strike_outs": p.get("strikeOuts"),
                    "hit_by_pitch": p.get("hitByPitch"),
                    "wins": p.get("wins"), "losses": p.get("losses"),
                    "saves": p.get("saves"),
                    "number_of_pitches": p.get("numberOfPitches"),
                })
    return bat_rows, pit_rows


def _upsert(conn, table: str, cols: list[str], rows: list[dict]) -> int:
    if not rows:
        return 0
    col_sql = ", ".join(cols)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols if c not in ("game_pk", "player_id"))
    sql = (
        f"INSERT INTO {table} ({col_sql}, updated_at) VALUES %s "
        f"ON CONFLICT (game_pk, player_id) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(cols)) + ", now())"
    data = [tuple(r[c] for c in cols) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest per-game batting/pitching from boxscores")
    p.add_argument("--days", type=int, default=3, help="Process games in the last N days (default 3)")
    p.add_argument("--start", help="Start date YYYY-MM-DD (overrides --days)")
    p.add_argument("--end", help="End date YYYY-MM-DD (defaults to today)")
    p.add_argument("--season", type=int, help="Process a whole season instead of a date range")
    p.add_argument("--dsn", default=DEFAULT_DSN, help="Postgres DSN (default: $DATABASE_URL)")
    a = p.parse_args(argv)
    end = dt.date.fromisoformat(a.end) if a.end else dt.date.today()
    start = dt.date.fromisoformat(a.start) if a.start else end - dt.timedelta(days=a.days - 1)
    return start.isoformat(), end.isoformat(), a.season, a.dsn


def main(argv=None) -> int:
    start, end, season, dsn = parse_args(argv)
    scope = f"season {season}" if season else f"{start} ~ {end}"
    log.info("Ingesting boxscores for %s -> %s", scope, safe_dsn(dsn))
    conn = None
    try:
        conn = connect(dsn)
        games = games_to_process(conn, start, end, season)
        log.info("%d finished games to process", len(games))
        total_bat = total_pit = 0
        for game_pk, gseason, date in games:
            box = api_get(f"game/{game_pk}/boxscore")
            bat, pit = parse_boxscore(box, game_pk, gseason, date)
            total_bat += _upsert(conn, "batting_stats", BAT_COLS, bat)
            total_pit += _upsert(conn, "pitching_stats", PIT_COLS, pit)
        log.info("Done: %d batting lines, %d pitching lines", total_bat, total_pit)
        return 0
    except Exception:
        log.exception("Boxscore ingestion failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
