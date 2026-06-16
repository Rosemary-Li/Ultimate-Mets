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
  page.tsx            Home — real hero counts (v_site_stats) + real "Latest Games"
  api/
    games/            GET /api/games, /api/games?season=, /api/games/:gamePk
    players/          GET /api/players, /api/players?q=, /api/players/:playerId
  players/            DATA-DRIVEN: roster index (page.tsx) + profile ([playerId])
    layout.tsx          scopes CSS under .route-players + imports styles.css
  seasons/ games/ leaders/ postseason/ lab/ media/
                      Still the ported prototypes (illustrative data, not yet wired)
                      Each: page.tsx + styles.css + layout.tsx (.route-<name> scope)
components/
  TopBar.tsx          The ONE nav bar, defined once, used everywhere
  Footer.tsx, SignInModal.tsx, RecentlyViewed.tsx, RecentTracker.tsx
lib/
  nav.ts              Single source of truth for nav items + section colors
  db.ts               Postgres access via the `pg` client (Pool); queries return []
                      on error so the UI degrades gracefully
  types.ts            Shared types (Game, Player, SeasonBatting/Pitching, SiteStats)
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

- `GET /api/games` · `?season=2024` · `/api/games/:gamePk`
- `GET /api/players` · `?q=<name>` · `/api/players/:playerId` (bio + season batting/pitching)
- `GET /api/seasons` · `/api/seasons/:year` (standings line + that season's games)

Server components also read the DB directly (e.g. the home hero counts and the player
profile pages).

## What's real vs. illustrative

| Real (from the DB) | Illustrative (prototype data, not yet wired) |
|---|---|
| Home hero counts, Home "Latest Games" | Games detail page, Leaders |
| `/players` roster + player profiles | Postseason, Lab, Media |
| `/seasons` index + `/seasons/:year` detail | "Today in History", "Trending" (editorial) |
| `/api/games`, `/api/players`, `/api/seasons` | |

## Known follow-ups

- **Type-checking is disabled during build** (`next.config.mjs` →
  `typescript.ignoreBuildErrors`). The not-yet-wired pages were ported from untyped JS
  prototypes; they run but aren't fully typed. The `lib/`, `app/api/`, `app/players/`,
  and `app/page.tsx` code is properly typed. Tighten the rest, then re-enable.
- Wire the remaining pages to the DB as each data domain lands in the pipeline
  (Seasons/Standings → Leaders → Postseason → editorial content).
