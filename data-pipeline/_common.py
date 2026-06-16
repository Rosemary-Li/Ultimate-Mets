"""Shared helpers for the ingest scripts: MLB API fetch + Postgres connection."""
import json
import logging
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import psycopg2

METS_TEAM_ID = 121
SPORT_ID = 1
API_BASE = "https://statsapi.mlb.com/api/v1"
DEFAULT_DSN = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/ultimate_mets")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def api_get(path: str, **params) -> dict:
    """GET {API_BASE}/{path}?{params} and return parsed JSON."""
    url = f"{API_BASE}/{path}"
    if params:
        url += "?" + urlencode(params)
    req = Request(url, headers={"User-Agent": "ultimate-mets-ingest/1.0"})
    with urlopen(req, timeout=30) as resp:
        return json.load(resp)


def connect(dsn: str = DEFAULT_DSN):
    return psycopg2.connect(dsn)


def safe_dsn(dsn: str) -> str:
    """Mask a password embedded in a DSN, for log output."""
    if "@" in dsn and "//" in dsn:
        scheme, rest = dsn.split("//", 1)
        creds, host = rest.split("@", 1)
        if ":" in creds:
            return f"{scheme}//{creds.split(':', 1)[0]}:***@{host}"
    return dsn


def ip_to_outs(ip) -> int:
    """Convert MLB innings-pitched notation ('5.2' = 5 IP + 2 outs) to total outs."""
    if ip is None:
        return 0
    whole, _, frac = str(ip).partition(".")
    return int(whole or 0) * 3 + int(frac[:1] or 0)
