#!/usr/bin/env python3
"""Seed the editorial tables (today_in_history, trending, media_items).

This is the "simple input method" for human-curated content the MLB API can't
provide. It TRUNCATEs and re-inserts the seed set, so it's safe to re-run and
gives a clean known state. Edit the data below (or the rows in the DB directly)
to manage editorial content.

Run AFTER schema_editorial.sql has been applied.
  DATABASE_URL=postgresql://localhost:5432/ultimate_mets python3 seed_editorial.py
"""
import logging
import sys

from _common import connect, safe_dsn, DEFAULT_DSN

log = logging.getLogger("seed_editorial")

# ---- "Today in Mets History" (ported from the home prototype, May 9) ----
TODAY_IN_HISTORY = [
    (5, 9, 1981, "Cleon Jones Old-Timers Day return",
     "Cleon Jones returns to Shea Stadium for an Old-Timers Day appearance, drawing a 12-minute standing ovation.",
     "Old-Timers Day · Shea Stadium"),
    (5, 9, 1996, "Bernard Gilkey hits for the cycle",
     "Bernard Gilkey hits for the cycle vs the Padres — first Met to do it since Keith Hernandez in 1985.",
     "NYM 6, SDP 4 · 9 innings"),
    (5, 9, 2008, "Pedro Martinez returns with 7 shutout innings",
     "Pedro Martinez throws 7 shutout innings in his return from injury.",
     "NYM 4, LAD 0"),
    (5, 9, 2015, "Lucas Duda walk-off home run",
     "Lucas Duda hits a walk-off HR vs the Phillies in the 11th — Mets pull within 1 game of the NL East lead.",
     "NYM 5, PHI 4 (11)"),
    (5, 9, 2024, "Pete Alonso passes Strawberry",
     "Pete Alonso passes Darryl Strawberry for 2nd on the franchise career HR list (253).",
     "NYM 7, ATL 3"),
]

# ---- Weekly "Trending" rail (ported from the home prototype) ----
TRENDING = [
    (1, "Pete Alonso", "Player · 1B · franchise HR leader", "/players"),
    (2, "2024 Mets", "Season · 89-73 · NLCS", "/seasons/2024"),
    (3, "2024 NL Wild Card Series", "Postseason · won 2-1", "/postseason/2024"),
    (4, "Career HR Leaders", "Leaders · all-time", "/leaders?scope=career&type=batting&stat=home_runs"),
    (5, "Strikeout Leaders", "Leaders · pitching", "/leaders?scope=career&type=pitching&stat=strike_outs"),
]

# ---- Media archive (representative sample; expand as needed) ----
MEDIA_ITEMS = [
    # media_type, title, description, era, season, player, source, url, published_at, featured
    ("video", "1986 World Series Game 6: The Comeback", "The 10th-inning rally that kept the Mets alive.", "1980s", 1986, "Mookie Wilson", "MLB Vault", "#", "1986-10-25", True),
    ("video", "Pete Alonso 53rd HR sets rookie record", "Alonso passes Aaron Judge for the rookie HR record.", "2010s", 2019, "Pete Alonso", "SNY", "#", "2019-09-28", True),
    ("photo", "Tom Seaver windup, 1969", "Classic photo of 'The Franchise' mid-delivery.", "1960s", 1969, "Tom Seaver", "Getty", "#", "1969-07-09", False),
    ("article", "How the 2024 Mets found their identity", "A look at the OMG season and the NLCS run.", "2020s", 2024, "Francisco Lindor", "The Athletic", "#", "2024-10-21", True),
    ("audio", "Amazin' Pod: 1986 oral history", "Players recall the championship season.", "1980s", 1986, None, "Amazin' Pod", "#", "2021-05-01", False),
    ("video", "Edwin Diaz entrance: 'Narco'", "Citi Field erupts as Diaz jogs in from the pen.", "2020s", 2022, "Edwin Díaz", "SNY", "#", "2022-08-12", False),
    ("photo", "Mike Piazza post-9/11 home run", "The shot that lifted a city, Sept 21, 2001.", "2000s", 2001, "Mike Piazza", "AP", "#", "2001-09-21", True),
    ("article", "Jacob deGrom's back-to-back Cy Youngs", "Breaking down a historic two-year run.", "2010s", 2019, "Jacob deGrom", "FanGraphs", "#", "2019-11-13", False),
    ("video", "David Wright walk-off vs Phillies", "The Captain delivers in extras.", "2000s", 2008, "David Wright", "MLB", "#", "2008-09-07", False),
    ("photo", "Shea Stadium final game", "Fans say goodbye to Shea, 2008.", "2000s", 2008, None, "Getty", "#", "2008-09-28", False),
    ("audio", "Howie Rose calls the 2015 pennant", "The radio call of the NL pennant clincher.", "2010s", 2015, None, "WOR", "#", "2015-10-21", False),
    ("video", "Lindor grand slam vs Phillies, 2024", "A defining swing of the 2024 stretch run.", "2020s", 2024, "Francisco Lindor", "SNY", "#", "2024-09-30", True),
]


def seed(conn) -> None:
    # media_items is auto-ingested from MLB highlights (ingest_media.py) — not seeded here.
    with conn.cursor() as cur:
        cur.execute("TRUNCATE today_in_history, trending RESTART IDENTITY")
        cur.executemany(
            "INSERT INTO today_in_history (event_month, event_day, event_year, headline, blurb, meta) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            TODAY_IN_HISTORY,
        )
        cur.executemany(
            "INSERT INTO trending (position, title, subtitle, href) VALUES (%s,%s,%s,%s)",
            TRENDING,
        )
    conn.commit()


def main(argv=None) -> int:
    dsn = DEFAULT_DSN
    if argv:
        dsn = argv[0]
    log.info("Seeding editorial content -> %s", safe_dsn(dsn))
    conn = None
    try:
        conn = connect(dsn)
        seed(conn)
        log.info("Done: %d history, %d trending (media via ingest_media.py)",
                 len(TODAY_IN_HISTORY), len(TRENDING))
        return 0
    except Exception:
        log.exception("Editorial seed failed")
        return 1
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
