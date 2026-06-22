#!/usr/bin/env python3
"""Resolve the best real photo for every player into players.photo_url.

The MLB headshot CDN returns a generic grey silhouette (HTTP 200, not a 404) for
players it has no photo of — which is most of the 1962–80s roster. So we:

  1. Fetch the player's MLB headshot and compare it to the known silhouette.
     - Different  -> MLB has a real photo; store the MLB URL.
     - Silhouette -> MLB has none; fall through to Wikipedia.
  2. Search Wikipedia/Wikimedia Commons for the player, verified as a baseball
     player and disambiguated by birth year (we have players.birth_date), and
     store that image URL.
  3. No match anywhere -> leave photo_url NULL; the web app then renders a clean
     initials avatar instead of the grey silhouette.

All images are linked, never re-hosted. Wikimedia content is CC/public-domain.
Idempotent: only fills players with NULL photo_url unless --refresh is given.
Resilient: a failure on one player is logged and skipped.

  DATABASE_URL=... python3 ingest_player_photos.py [--refresh] [--limit N]
"""
import argparse
import hashlib
import json
import logging
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from _common import DEFAULT_DSN, connect, safe_dsn

log = logging.getLogger("photos")

MLB_SPOTS = "https://midfield.mlbstatic.com/v1/people/{id}/spots/240"
WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
# Wikimedia asks for a descriptive User-Agent with contact info.
UA = "ultimate-mets/1.0 (https://ultimatemets.com; photos ingest)"


def fetch_bytes(url: str, timeout: int = 30) -> bytes | None:
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except (HTTPError, URLError, TimeoutError, ConnectionError) as err:
        log.debug("fetch failed %s: %s", url, err)
        return None


def fetch_json(url: str, timeout: int = 30) -> dict | None:
    req = Request(url, headers={"User-Agent": UA})
    try:
        with urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    except (HTTPError, URLError, TimeoutError, ConnectionError) as err:
        log.debug("fetch failed %s: %s", url, err)
        return None


def silhouette_hash() -> str | None:
    """Hash the generic silhouette by requesting a non-existent player id."""
    data = fetch_bytes(MLB_SPOTS.format(id=99999999))
    return hashlib.md5(data).hexdigest() if data else None


def mlb_photo_url(player_id: int, silhouette: str | None) -> str | None:
    """Return the MLB headshot URL if it's a real photo (not the silhouette)."""
    url = MLB_SPOTS.format(id=player_id)
    data = fetch_bytes(url)
    if not data:
        return None
    if silhouette and hashlib.md5(data).hexdigest() == silhouette:
        return None  # it's the grey placeholder
    return url


def _year(text: str | None) -> int | None:
    """First 4-digit year (18xx/19xx/20xx) found in a string."""
    if not text:
        return None
    import re
    m = re.search(r"\b(18|19|20)\d{2}\b", text)
    return int(m.group(0)) if m else None


def wikipedia_photo(name: str, birth_year: int | None) -> str | None:
    """Find a baseball player's photo on Wikipedia, disambiguated by birth year."""
    # 1. search for candidate page titles
    q = urlencode({
        "action": "query", "list": "search", "format": "json",
        "srsearch": f'{name} baseball player', "srlimit": 4,
    })
    res = fetch_json(f"{WIKI_API}?{q}")
    if not res:
        return None
    titles = [hit["title"] for hit in res.get("query", {}).get("search", [])]

    for title in titles:
        summ = fetch_json(WIKI_SUMMARY.format(title=quote(title.replace(" ", "_"))))
        if not summ:
            continue
        desc = (summ.get("description") or "") + " " + (summ.get("extract") or "")
        if "baseball" not in desc.lower():
            continue  # avoid grabbing a same-named non-ballplayer
        # birth-year guard: if both known and they disagree by >1 year, reject
        wy = _year(summ.get("description"))
        if birth_year and wy and abs(wy - birth_year) > 1:
            continue
        thumb = (summ.get("originalimage") or summ.get("thumbnail") or {}).get("source")
        if thumb:
            return thumb
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--refresh", action="store_true",
                    help="Re-resolve every player (default: only NULL photo_url)")
    ap.add_argument("--limit", type=int, help="Process at most N players")
    ap.add_argument("--dsn", default=DEFAULT_DSN)
    a = ap.parse_args()

    log.info("connecting to %s", safe_dsn(a.dsn))
    conn = connect(a.dsn)
    cur = conn.cursor()

    where = "" if a.refresh else "WHERE photo_url IS NULL"
    limit = f"LIMIT {a.limit}" if a.limit else ""
    cur.execute(f"SELECT player_id, full_name, birth_date FROM players {where} "
                f"ORDER BY player_id {limit}")
    players = cur.fetchall()
    log.info("resolving photos for %d players", len(players))

    sil = silhouette_hash()
    if not sil:
        log.warning("could not fetch the silhouette reference; MLB photos may be "
                    "stored even when they're placeholders")

    mlb_n = wiki_n = none_n = 0
    for i, (pid, name, birth) in enumerate(players, 1):
        try:
            url = mlb_photo_url(pid, sil)
            source = "mlb"
            if not url:
                url = wikipedia_photo(name or "", _year(birth))
                source = "wiki"
            if url:
                cur.execute("UPDATE players SET photo_url = %s WHERE player_id = %s",
                            (url, pid))
                if source == "mlb":
                    mlb_n += 1
                else:
                    wiki_n += 1
            else:
                none_n += 1
            if i % 50 == 0:
                conn.commit()
                log.info("  %d/%d  (mlb=%d wiki=%d none=%d)",
                         i, len(players), mlb_n, wiki_n, none_n)
            time.sleep(0.2)  # be polite to both APIs
        except Exception as err:  # noqa: BLE001 — never abort the whole run
            log.warning("player %s (%s) failed: %s — skipping", pid, name, err)

    conn.commit()
    cur.close()
    conn.close()
    log.info("done: mlb=%d  wiki=%d  no-photo=%d  (of %d)",
             mlb_n, wiki_n, none_n, len(players))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
