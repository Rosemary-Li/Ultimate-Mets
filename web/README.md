# Ultimate Mets — Web App

A full-stack [Next.js](https://nextjs.org) (App Router, TypeScript) application: one
project for both the UI and the API. It unifies the eight original HTML prototypes
into a single app with a shared layout and navigation, and reads live data from the
PostgreSQL database the data pipeline writes.

## Quick start

```bash
cd web
npm install
echo "DATABASE_URL=postgresql://localhost:5432/ultimate_mets" > .env.local
npm run dev      # http://localhost:3000
```

`npm run build && npm start` runs the production build. If the database is empty or
unavailable, data-backed sections return empty and the rest falls back to illustrative
content — the site still renders.

## Structure

```
app/
  layout.tsx          Root layout — renders the shared TopBar + Footer on EVERY page
  globals.css         Design tokens + shared chrome (top bar, footer, modal)
  page.tsx            Home — all sections data-driven (counts, latest games,
                      today-in-history, trending)
  api/                games · players · seasons · leaders · postseason · media ·
                      today · compare  (each reads the DB via the pg client)
  players/  seasons/  games/  leaders/  postseason/  media/  lab/
                      DATA-DRIVEN routes. Each: page.tsx (+ [id]/page.tsx) +
                      styles.css + layout.tsx (scopes CSS under .route-<name>)
  Dockerfile          Next.js standalone image for Cloud Run
components/
  TopBar.tsx          The ONE nav bar, defined once, used everywhere
  Footer.tsx, SignInModal.tsx, RecentlyViewed.tsx, RecentTracker.tsx
lib/
  nav.ts              Single source of truth for nav items + section colors
  db.ts               Postgres access via the `pg` client (Pool); queries return []
                      on error so the UI degrades gracefully
  types.ts            Shared types (Game, Player, Season/Box batting & pitching,
                      TeamSeason, PostseasonSeries, Trending, MediaItem, SiteStats, …)
```

### One navigation bar, defined once

The old prototypes each defined their own `TopBar`, so the nav bar drifted between
pages. Here the bar lives in a single component ([components/TopBar.tsx](components/TopBar.tsx))
rendered by the root layout, with links from one config ([lib/nav.ts](lib/nav.ts)) and
the active item detected via `usePathname()`. Changing a menu item is a one-line edit
that updates every page.

### Page CSS is scoped to avoid cross-page bleed

Each page's stylesheet is global in Next.js, and pages reuse class names (`.card`,
`.tabs`) with different rules. To stop collisions after client-side navigation, every
page's CSS is prefixed with a `.route-<name>` scope and the route's `layout.tsx` wraps
the page in `<div className="route-<name>">`. Shared chrome stays global in `globals.css`.

## Backend (front-end + back-end in one app)

API route handlers query the shared PostgreSQL database via the `pg` client (no separate
API server). Connection comes from `DATABASE_URL`.

- `GET /api/games` · `?season=2024` · `/api/games/:gamePk` (linescore + box score)
- `GET /api/players` · `?q=<name>` · `/api/players/:playerId` (bio + season batting/pitching)
- `GET /api/seasons` · `/api/seasons/:year` (standings line + that season's games)
- `GET /api/leaders` `?scope=career|season&type=batting|pitching&stat=…&season=…`
- `GET /api/postseason` · `/api/postseason/:year`
- `GET /api/media` `?type=…` · `GET /api/today` (editorial + game anniversaries)
- `GET /api/compare?ids=…` (career stats for the Lab)

Server components also read the DB directly (home, player/season/game/postseason pages);
the Lab is a client component that calls the APIs.

## Everything is wired to the database

All pages render real data: home (counts, latest games, today-in-history, trending),
players (roster split current/historical + profiles), seasons, games (linescore + box
score), leaders, postseason, media, and the Lab comparison. The database currently holds
2024–2026; backfill earlier seasons from the pipeline to extend it.

## Notes / follow-ups

- **Type-checking is relaxed during build** (`next.config.mjs` →
  `typescript.ignoreBuildErrors`). The data-driven pages and `lib/`/`app/api/` are
  properly typed; some leftover prototype helpers aren't. Tighten and re-enable when
  convenient.
- `output: "standalone"` is set for containerized deploys; see `Dockerfile` and
  [../docs/DEPLOY.md](../docs/DEPLOY.md).
