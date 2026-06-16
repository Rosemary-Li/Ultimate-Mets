# Ultimate Mets Database

A New York Mets stats and history site: a full-stack web app backed by a data
pipeline that ingests live game data from the official MLB Stats API. Every player,
season, game, and postseason moment — searchable, comparable, and connected.

> Statistics on the player/leader/media/comparison pages are currently illustrative
> (carried over from the design prototypes). Game-level data is real, pulled from MLB.

## Repository layout

```
.
├── web/             Next.js (App Router, TypeScript) front-end + back-end
└── data-pipeline/   Python ETL that ingests MLB game data into SQLite
```

The two parts are connected: the web app's API routes read the SQLite database that
the pipeline writes (`data-pipeline/mets.db`).

```
MLB Stats API ──► data-pipeline (Python) ──► mets.db (SQLite) ──► web (Next.js API + UI)
```

## Quick start

### 1. Data pipeline (optional but recommended first)

Pulls recent Mets games into `data-pipeline/mets.db`. Standard library only — no
`pip install` required.

```bash
cd data-pipeline
python3 ingest_games.py            # backfill the last 3 days
python3 ingest_games.py --start 2024-04-01 --end 2024-10-01   # a date range
```

See [data-pipeline/README.md](data-pipeline/README.md) for the schema, idempotent
upsert design, and how to schedule it with cron.

### 2. Web app

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

If the pipeline hasn't run yet, the site still works — the "Latest Games" section and
`/api/games` simply return empty until `mets.db` exists.

See [web/README.md](web/README.md) for the app structure, the shared layout/navigation,
and how page CSS is scoped.

## The web app at a glance

- **Next.js App Router + TypeScript**, front-end and back-end in one project.
- **One shared navigation bar and layout** rendered on every route, with nav items
  defined in a single config — so pages can't drift out of sync.
- **Pages**: Home, Players, Seasons, Games, Leaders, Postseason, Lab (comparison),
  Media. Each was ported from a standalone HTML prototype.
- **Backend**: API route handlers read the pipeline's SQLite DB via Node's built-in
  `node:sqlite` (no native modules, no separate server).
  - `GET /api/games` — most recent final games
  - `GET /api/games?season=2024` — all games in a season
  - `GET /api/games/:gamePk` — a single game by MLB `game_pk`

## The data pipeline at a glance

- Calls the MLB Stats API `/schedule` endpoint for the Mets (team id `121`).
- Writes to a `games` table keyed by MLB's unique `game_pk`.
- **Idempotent**: re-runnable any number of times (`INSERT ... ON CONFLICT DO UPDATE`),
  and backfills the last few days by default to absorb double-headers, postponements,
  and post-game stat corrections.
- Data source is the official **MLB Stats API** only (free, no key). Baseball-Reference
  is used solely as a design reference, never scraped.

## Tech stack

| Layer | Tech |
|---|---|
| Front-end / API | Next.js 16 (App Router), React 19, TypeScript |
| Charts | Chart.js |
| Database | SQLite (via `node:sqlite`); portable to PostgreSQL |
| Data pipeline | Python 3 (standard library: `urllib`, `sqlite3`) |
| Scheduling | cron (local dev); swappable for GitHub Actions / cloud scheduler |

## Roadmap

- Ingest player-level boxscore data (`batting_stats`, `pitching_stats` keyed by
  `(game_pk, player_id)`) and wire the player/leader pages to real data.
- Compute season/career totals and standings on the fly via SQL aggregation.
- Tighten TypeScript types on the ported prototype pages and re-enable type-checked
  builds (currently relaxed; see `web/README.md`).
