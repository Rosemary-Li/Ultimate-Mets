import "./home.css";
import Link from "next/link";
import { HREF } from "@/lib/nav";
import {
  getRecentGames,
  getSiteStats,
  getMediaCount,
  getTrending,
  getTodayEditorial,
  getGameAnniversaries,
} from "@/lib/db";
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
    desc: "Career profiles for every Met — rosters, bios, and season-by-season batting & pitching, split by current roster and historical players.",
    meta: ["rosters + bios"],
  },
  {
    key: "seasons",
    icon: "📅",
    title: "Seasons",
    href: HREF.seasons,
    desc: "Year-by-year breakdowns — record, standings finish, run differential, and the full game log for each season.",
    meta: ["standings + game logs"],
  },
  {
    key: "games",
    icon: "⚾",
    title: "Games",
    href: HREF.games,
    desc: "Single-game recaps with the linescore and a full box score — batting and pitching lines for both teams.",
    meta: ["box scores + linescore"],
  },
];

const TOOL_ENTRIES: Entry[] = [
  {
    key: "leaders",
    icon: "🏆",
    title: "Leaders",
    href: HREF.leaders,
    desc: "Career and single-season leaderboards — batting and pitching — computed from per-game data.",
    meta: ["career + season"],
  },
  {
    key: "post",
    icon: "🥇",
    title: "Postseason",
    href: HREF.postseason,
    desc: "Every postseason run in the database — series by series, with the Mets' result in each round and game-by-game scores.",
    meta: ["series + results", "by year"],
  },
  {
    key: "lab",
    icon: "⚗️",
    title: "Lab",
    href: HREF.lab,
    desc: "Side-by-side comparison tool. Stack 2–4 players and run a stat-by-stat showdown of their career numbers.",
    meta: ["compare 2–4 players", "career stats"],
  },
  {
    key: "media",
    icon: "🎬",
    title: "Media",
    href: HREF.media,
    desc: "Curated archive of videos, photos, articles, and podcasts. Filter by type, era, season, or player.",
    meta: ["video · photo · audio"],
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
  const mediaCount = await getMediaCount();
  const heroStats = [
    { num: stats?.seasons ? String(stats.seasons) : "64", lbl: "Seasons" },
    { num: stats?.players ? stats.players.toLocaleString() : "1,243", lbl: "Players" },
    { num: stats?.games ? stats.games.toLocaleString() : "0", lbl: "Games" },
    { num: stats?.postseasons ? String(stats.postseasons) : "11", lbl: "Postseasons" },
    { num: mediaCount ? mediaCount.toLocaleString() : "0", lbl: "Media Items" },
  ];

  // Real counts for the entry-card pills, keyed by section.
  const seasonRange =
    stats?.first_season && stats.last_season
      ? ` (${stats.first_season}–${stats.last_season})`
      : "";
  const entryCounts: Record<string, string | undefined> = {
    players: stats?.players ? `${stats.players.toLocaleString()} players` : undefined,
    seasons: stats?.seasons
      ? `${stats.seasons} season${stats.seasons > 1 ? "s" : ""}${seasonRange}`
      : undefined,
    games: stats?.games ? `${stats.games.toLocaleString()} games` : undefined,
    media: mediaCount ? `${mediaCount.toLocaleString()} items` : undefined,
  };
  const searchMeta = stats
    ? `⌘K · search across ${stats.players.toLocaleString()} players · ${stats.seasons} seasons · ${mediaCount} media items`
    : "⌘K · search players, seasons, games";

  // "Today in Mets History" — editorial blurbs + auto game anniversaries.
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const todayLabel = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const [trendingDb, editorial, anniversaries] = await Promise.all([
    getTrending(),
    getTodayEditorial(month, day),
    getGameAnniversaries(month, day),
  ]);
  const todayEvents: { year: number | null; text: string; meta: string }[] = [
    ...editorial.map((e) => ({
      year: e.event_year,
      text: e.blurb ?? e.headline ?? "",
      meta: e.meta ?? "",
    })),
    ...anniversaries.map((g) => {
      const home = g.mets_is_home === 1;
      const ms = home ? g.home_score : g.away_score;
      const os = home ? g.away_score : g.home_score;
      const opp = home ? g.away_team_name : g.home_team_name;
      const won = ms != null && os != null && ms > os;
      return {
        year: g.season,
        text: `Mets ${won ? "beat" : "lost to"} the ${opp} ${ms}–${os}.`,
        meta: `${g.official_date} · ${g.venue_name}`,
      };
    }),
  ]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 8);
  const trendingList = trendingDb.length
    ? trendingDb.map((t) => ({
        name: t.title ?? "",
        meta: t.subtitle ?? "",
        href: t.href ?? "#",
      }))
    : TRENDING;

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
            <div className="hero-search-meta">{searchMeta}</div>
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
                    {entryCounts[e.key] && (
                      <span className="pill">{entryCounts[e.key]}</span>
                    )}
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
                    {entryCounts[e.key] && (
                      <span className="pill">{entryCounts[e.key]}</span>
                    )}
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
                  Today in Mets History · {todayLabel}
                </div>
                <div className="section-sub">
                  What happened on this date — game results from the database, plus
                  curated notes
                </div>
              </div>
            </div>
            <div className="today-card">
              {todayEvents.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Nothing recorded for {todayLabel} yet.
                </div>
              ) : (
                todayEvents.map((h, i) => (
                  <div className="today-row" key={i}>
                    <div className="today-year">{h.year}</div>
                    <div className="today-text">
                      <div className="t">{h.text}</div>
                      <div className="meta">{h.meta}</div>
                    </div>
                  </div>
                ))
              )}
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
            {trendingList.map((t, i) => (
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
