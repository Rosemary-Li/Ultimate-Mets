#!/usr/bin/env python3
"""Ingest real game-highlight media from the MLB content API into media_items.

For each finished game it pulls /game/{pk}/content highlights (videos with real
thumbnails + playable mp4 URLs) and idempotently upserts them, deduped by the
MLB highlight id (external_id).

Run after ingest_games.py.

Examples:
  python3 ingest_media.py                      # highlights for games in the last 5 days
  python3 ingest_media.py --season 2024
  python3 ingest_media.py --start 2024-09-01 --end 2024-10-01
"""
import argparse
import datetime as dt
import logging
import re
import sys

from psycopg2.extras import execute_values

from _common import api_get, connect, safe_dsn, DEFAULT_DSN

log = logging.getLogger("ingest_media")


def strip_html(s: str | None) -> str | None:
    if not s:
        return None
    text = re.sub(r"<[^>]+>", "", s).strip()
    return (text[:240] + "…") if len(text) > 240 else text

COLUMNS = [
    "external_id", "media_type", "title", "description", "season", "game_pk",
    "source", "url", "thumb_url", "published_at", "duration", "featured",
]


def pick_mp4(playbacks: list) -> str | None:
    mp4s = [p.get("url") for p in playbacks if (p.get("url") or "").endswith(".mp4")]
    if not mp4s:
        return playbacks[0].get("url") if playbacks else None
    # prefer a ~720p cut
    for m in mp4s:
        if "1280x720" in m:
            return m
    return mp4s[0]


def pick_thumb(image: dict) -> str | None:
    cuts = (image or {}).get("cuts", [])
    if not cuts:
        return None
    # closest to 640px wide
    best = min(cuts, key=lambda c: abs((c.get("width") or 0) - 640))
    return best.get("src")


def pick_largest(image: dict) -> str | None:
    cuts = (image or {}).get("cuts", [])
    if not cuts:
        return None
    return max(cuts, key=lambda c: (c.get("width") or 0)).get("src")


def games_to_process(conn, start, end, season, limit):
    with conn.cursor() as cur:
        if season is not None:
            cur.execute(
                "SELECT game_pk, season FROM games WHERE status_code='F' AND season=%s "
                "ORDER BY official_date DESC LIMIT %s",
                (season, limit),
            )
        else:
            cur.execute(
                "SELECT game_pk, season FROM games WHERE status_code='F' "
                "AND official_date BETWEEN %s AND %s ORDER BY official_date DESC LIMIT %s",
                (start, end, limit),
            )
        return cur.fetchall()


def extract(content: dict, game_pk: int, season: int, per_game: int) -> list[dict]:
    rows = []

    # ---- videos: highlight clips ----
    items = content.get("highlights", {}).get("highlights", {}).get("items", [])
    for i, it in enumerate(items[:per_game]):
        ext = it.get("id") or it.get("mediaPlaybackId")
        if not ext:
            continue
        rows.append({
            "external_id": str(ext),
            "media_type": "video",
            "title": it.get("title") or it.get("headline"),
            "description": it.get("description") or it.get("blurb"),
            "season": season, "game_pk": game_pk, "source": "MLB",
            "url": pick_mp4(it.get("playbacks", [])),
            "thumb_url": pick_thumb(it.get("image", {})),
            "published_at": (it.get("date") or "")[:10] or None,
            "duration": it.get("duration"),
            "featured": i == 0,
        })

    # ---- article + photo: from the editorial recap/wrap ----
    editorial = content.get("editorial", {})
    for kind in ("recap", "wrap"):
        node = (editorial.get(kind) or {}).get("mlb")
        if not node or not node.get("headline"):
            continue
        slug = node.get("slug") or str(node.get("id") or game_pk)
        thumb = pick_thumb(node.get("image", {}))
        rows.append({
            "external_id": f"art-{slug}",
            "media_type": "article",
            "title": node.get("headline"),
            "description": node.get("subhead") or strip_html(node.get("body")),
            "season": season, "game_pk": game_pk, "source": "MLB.com",
            "url": f"https://www.mlb.com/news/{slug}",
            "thumb_url": thumb,
            "published_at": (node.get("date") or "")[:10] or None,
            "duration": None, "featured": False,
        })
        full = pick_largest(node.get("image", {}))
        if full:
            rows.append({
                "external_id": f"photo-{slug}",
                "media_type": "photo",
                "title": node.get("headline"),
                "description": None,
                "season": season, "game_pk": game_pk, "source": "MLB",
                "url": full,
                "thumb_url": thumb,
                "published_at": (node.get("date") or "")[:10] or None,
                "duration": None, "featured": False,
            })
        break  # one recap article+photo per game is enough
    return rows


def upsert(conn, rows: list[dict]) -> int:
    if not rows:
        return 0
    cols = ", ".join(COLUMNS)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "external_id")
    sql = (
        f"INSERT INTO media_items ({cols}, updated_at) VALUES %s "
        f"ON CONFLICT (external_id) DO UPDATE SET {updates}, updated_at = now()"
    )
    template = "(" + ", ".join(["%s"] * len(COLUMNS)) + ", now())"
    data = [tuple(r[c] for c in COLUMNS) for r in rows]
    with conn.cursor() as cur:
        execute_values(cur, sql, data, template=template)
    conn.commit()
    return len(rows)


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Ingest MLB game-highlight media")
    p.add_argument("--days", type=int, default=5)
    p.add_argument("--start")
    p.add_argument("--end")
    p.add_argument("--season", type=int)
    p.add_argument("--games", type=int, default=60, help="Max games to scan")
    p.add_argument("--per-game", type=int, default=5, help="Max highlights per game")
    p.add_argument("--dsn", default=DEFAULT_DSN, help="Postgres DSN (default: $DATABASE_URL)")
    a = p.parse_args(argv)
    end = dt.date.fromisoformat(a.end) if a.end else dt.date.today()
    start = dt.date.fromisoformat(a.start) if a.start else end - dt.timedelta(days=a.days - 1)
    return start.isoformat(), end.isoformat(), a.season, a.games, a.per_game, a.dsn


def main(argv=None) -> int:
    start, end, season, limit, per_game, dsn = parse_args(argv)
    scope = f"season {season}" if season else f"{start} ~ {end}"
    log.info("Ingesting media highlights for %s -> %s", scope, safe_dsn(dsn))
    conn = None
    try:
        conn = connect(dsn)
        games = games_to_process(conn, start, end, season, limit)
        log.info("%d games to scan for highlights", len(games))
        total = 0
        for game_pk, gseason in games:
            try:
                content = api_get(f"game/{game_pk}/content")
            except Exception:
                continue
            total += upsert(conn, extract(content, game_pk, gseason, per_game))
        log.info("Done: %d media items", total)
        return 0
    except Exception:
        log.exception("Media ingestion failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main())
