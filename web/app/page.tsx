import "./home.css";
import Link from "next/link";
import { ReactNode } from "react";
import { HREF } from "@/lib/nav";
import { getRecentGames, getSiteStats } from "@/lib/db";
import RecentlyViewed from "@/components/RecentlyViewed";

interface Entry {
  key: string;
  icon: string;
  title: string;
  href: string;
  desc: string;
  meta: string[];
}

const DETAIL_ENTRIES: Entry[] = [
  {
    key: "players",
    icon: "👤",
    title: "Players",
    href: HREF.players,
    desc: "Career profiles for every Met — from Tom Seaver to Pete Alonso. Stats, splits, percentile rankings, and similarity scores.",
    meta: ["1,243 players", "since 1962"],
  },
  {
    key: "seasons",
    icon: "📅",
    title: "Seasons",
    href: HREF.seasons,
    desc: "Year-by-year breakdowns. Schedule, standings, leaders, transactions, and the postseason path for every season since 1962.",
    meta: ["64 seasons", "1962 → 2025"],
  },
  {
    key: "games",
    icon: "⚾",
    title: "Games",
    href: HREF.games,
    desc: "Single-game recaps with box scores, play-by-play, win-probability charts, and fan discussion threads anchored to specific moments.",
    meta: ["10,000+ games", "with discussion"],
  },
];

const TOOL_ENTRIES: Entry[] = [
  {
    key: "leaders",
    icon: "🏆",
    title: "Leaders",
    href: HREF.leaders,
    desc: "Career and single-season leaderboards. Filter by era, position, or playing-time minimum. Save your own custom views.",
    meta: ["All-time rankings", "savable views"],
  },
  {
    key: "post",
    icon: "🥇",
    title: "Postseason",
    href: HREF.postseason,
    desc: "All 11 postseason runs in one place. Series-by-series drill-down, career postseason leaders, and the franchise's most famous moments.",
    meta: ["11 appearances", "2 WS · 5 NL pennants"],
  },
  {
    key: "lab",
    icon: "⚗️",
    title: "Lab",
    href: HREF.lab,
    desc: "Side-by-side comparison tool. Stack 2–4 players, overlay career arcs, compare 5-tool grades, and run a stat-by-stat showdown.",
    meta: ["Up to 4 players", "20-80 scouting scale"],
  },
  {
    key: "media",
    icon: "🎬",
    title: "Media",
    href: HREF.media,
    desc: "Searchable archive of videos, photos, articles, and podcasts. Filter by era, season, or player. Browse curated collections.",
    meta: ["12,824 items", "video · photo · audio"],
  },
];

const TODAY_HISTORY: { year: number; t: ReactNode; meta: string }[] = [
  {
    year: 1981,
    t: "Cleon Jones returns to Shea Stadium for an Old-Timers Day appearance, drawing a 12-minute standing ovation.",
    meta: "Old-Timers Day · Shea Stadium",
  },
  {
    year: 1996,
    t: "Bernard Gilkey hits for the cycle vs the Padres — first Met to do it since Keith Hernandez in 1985.",
    meta: "NYM 6, SDP 4 · 9 innings",
  },
  {
    year: 2008,
    t: (
      <>
        Pedro Martinez throws 7 shutout innings in his return from injury —{" "}
        <Link href={HREF.games}>view game</Link>.
      </>
    ),
    meta: "NYM 4, LAD 0",
  },
  {
    year: 2015,
    t: "Lucas Duda hits walk-off HR vs the Phillies in the 11th. — Mets pull within 1 game of NL East lead.",
    meta: "NYM 5, PHI 4 (11)",
  },
  {
    year: 2024,
    t: "Pete Alonso passes Darryl Strawberry for 2nd on the franchise career HR list (253).",
    meta: "NYM 7, ATL 3",
  },
];

const TRENDING = [
  { name: "Pete Alonso", meta: "Player · 1B · 226 HR as a Met", href: HREF.players },
  { name: "2024 Mets", meta: "Season · 89-73 · NLCS", href: HREF.seasons },
  {
    name: "1986 World Series Game 6",
    meta: "Game · Oct 25, 1986",
    href: HREF.games,
  },
  { name: "Career bWAR Leaders", meta: "Leaders · all-time", href: HREF.leaders },
  {
    name: "Wright vs Hernandez vs HoJo",
    meta: "Lab · 3-way compare",
    href: HREF.lab,
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Real data from the pipeline DB (empty array if the pipeline hasn't run).
  const latestGames = await getRecentGames(5);

  // Hero counts computed from the DB; fall back to illustrative figures if empty.
  const stats = await getSiteStats();
  const heroStats = [
    { num: stats?.seasons ? String(stats.seasons) : "64", lbl: "Seasons" },
    { num: stats?.players ? stats.players.toLocaleString() : "1,243", lbl: "Players" },
    { num: stats?.postseasons ? String(stats.postseasons) : "11", lbl: "Postseasons" },
    { num: "2", lbl: "WS Titles" },
    { num: "12,824", lbl: "Media Items" },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            Ultimate <span className="accent">Mets</span>
            <br />
            Database
          </h1>
          <p className="hero-sub">
            Every player, every season, every game, every postseason moment in
            franchise history — searchable, comparable, and connected.
          </p>
          <div className="hero-search">
            <input placeholder='Try "David Wright", "1986 World Series", "Pete Alonso HR"...' />
            <div className="hero-search-meta">
              ⌘K · search across 1,243 players · 64 seasons · 12,824 media items
            </div>
          </div>
          <div className="hero-stats">
            {heroStats.map((s) => (
              <div className="hero-stat" key={s.lbl}>
                <div className="num">{s.num}</div>
                <div className="lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="main">
        <div>
          <section className="section">
            <div className="group-label">
              <span className="num">A</span>
              <span className="name">Browse by Detail</span>
              <span className="desc">— Open a single player, season, or game</span>
            </div>
            <div className="entry-grid three">
              {DETAIL_ENTRIES.map((e) => (
                <Link className="entry" key={e.key} href={e.href}>
                  <div className="e-head">
                    <div className={"e-icon " + e.key}>{e.icon}</div>
                    <div className="e-arrow">→</div>
                  </div>
                  <div className="e-title">{e.title}</div>
                  <div className="e-desc">{e.desc}</div>
                  <div className="e-meta">
                    {e.meta.map((m, i) => (
                      <span key={i} className="pill">
                        {m}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            <div className="group-label">
              <span className="num">B</span>
              <span className="name">Tools &amp; Discover</span>
              <span className="desc">— Rank, compare, browse, watch</span>
            </div>
            <div className="entry-grid four">
              {TOOL_ENTRIES.map((e) => (
                <Link className="entry" key={e.key} href={e.href}>
                  <div className="e-head">
                    <div className={"e-icon " + e.key}>{e.icon}</div>
                    <div className="e-arrow">→</div>
                  </div>
                  <div className="e-title">{e.title}</div>
                  <div className="e-desc">{e.desc}</div>
                  <div className="e-meta">
                    {e.meta.map((m, i) => (
                      <span key={i} className="pill">
                        {m}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {latestGames.length > 0 && (
            <section className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">Latest Games</div>
                  <div className="section-sub">
                    Live from the MLB data pipeline · {latestGames.length} most
                    recent finals
                  </div>
                </div>
                <Link href={HREF.games} className="section-link">
                  All games →
                </Link>
              </div>
              <div className="today-card">
                {latestGames.map((g) => {
                  const metsHome = g.mets_is_home === 1;
                  const metsScore = metsHome ? g.home_score : g.away_score;
                  const oppScore = metsHome ? g.away_score : g.home_score;
                  const opp = metsHome ? g.away_team_name : g.home_team_name;
                  const won =
                    metsScore != null &&
                    oppScore != null &&
                    metsScore > oppScore;
                  return (
                    <div className="today-row" key={g.game_pk}>
                      <div
                        className="today-year"
                        style={{ color: won ? "var(--c-games)" : undefined }}
                      >
                        {won ? "W" : "L"}
                      </div>
                      <div className="today-text">
                        <div className="t">
                          {metsHome ? "vs" : "@"} {opp} · {metsScore}–{oppScore}
                        </div>
                        <div className="meta">
                          {g.official_date} · {g.venue_name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <div>
                <div className="section-title">
                  Today in Mets History · May 9
                </div>
                <div className="section-sub">
                  5 things that happened on this date in franchise history
                </div>
              </div>
              <a href="#" className="section-link">
                Pick another date →
              </a>
            </div>
            <div className="today-card">
              {TODAY_HISTORY.map((h, i) => (
                <div className="today-row" key={i}>
                  <div className="today-year">{h.year}</div>
                  <div className="today-text">
                    <div className="t">{h.t}</div>
                    <div className="meta">{h.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside>
          <div
            className="side-card"
            style={{
              background:
                "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
              borderColor: "#FED7AA",
            }}
          >
            <div
              className="side-title"
              style={{ borderBottom: "1px solid #FED7AA" }}
            >
              <span style={{ color: "var(--mets-orange)" }}>
                How to use this site
              </span>
            </div>
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--text-muted)",
              }}
            >
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text)" }}>1.</strong> Pick a
                section above (Players, Seasons, Games for details — Leaders,
                Postseason, Lab, Media to explore).
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong style={{ color: "var(--text)" }}>2.</strong> Inside any
                page,{" "}
                <span
                  style={{ color: "var(--mets-orange)", fontWeight: 600 }}
                >
                  orange-underlined names
                </span>{" "}
                are clickable — they jump to the relevant detail page.
              </p>
              <p>
                <strong style={{ color: "var(--text)" }}>3.</strong> Pages you
                visit show up in <strong>Recently Viewed</strong> so you can
                navigate back.
              </p>
            </div>
          </div>

          <RecentlyViewed />

          <div className="side-card">
            <div className="side-title">
              <span>Trending This Week</span>
            </div>
            {TRENDING.map((t, i) => (
              <Link key={i} href={t.href} className="quicklink">
                <div className="ql-name">{t.name}</div>
                <div className="ql-meta">{t.meta}</div>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
}
