import "./home.css";
import Link from "next/link";
import {
  getRecentGames,
  getSiteStats,
  getMediaCount,
  getLeaders,
  getAutoTrending,
  getSeasons,
  getTodayEditorial,
  getGameAnniversaries,
} from "@/lib/db";
import { photoOf, teamLogo } from "@/lib/images";
import type { Game } from "@/lib/types";
import ChartView from "@/components/ChartView";

export const dynamic = "force-dynamic";

const METS_ID = 121;

const EXPLORE = [
  { key: "players", icon: "👤", title: "Players", href: "/players", blurb: "Every Met, 1962–2026" },
  { key: "seasons", icon: "📅", title: "Seasons", href: "/seasons", blurb: "65 years of standings" },
  { key: "games", icon: "⚾", title: "Games", href: "/games", blurb: "Box scores & linescores" },
  { key: "leaders", icon: "🏆", title: "Leaders", href: "/leaders", blurb: "Career & season rankings" },
  { key: "post", icon: "🥇", title: "Postseason", href: "/postseason", blurb: "11 playoff runs" },
  { key: "lab", icon: "⚗️", title: "Lab", href: "/lab", blurb: "Compare players head-to-head" },
  { key: "media", icon: "🎬", title: "Media", href: "/media", blurb: "Video, photos & more" },
];

function metsView(g: Game) {
  const home = g.mets_is_home === 1;
  const metsScore = home ? g.home_score : g.away_score;
  const oppScore = home ? g.away_score : g.home_score;
  const oppId = home ? g.away_team_id : g.home_team_id;
  const oppName = home ? g.away_team_name : g.home_team_name;
  const won = metsScore != null && oppScore != null && metsScore > oppScore;
  return { home, metsScore, oppScore, oppId, oppName, won };
}

export default async function HomePage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const [recent, hrLeaders, stats, mediaCount, trending, seasons, editorial, anniv] =
    await Promise.all([
      getRecentGames(11),
      getLeaders({ scope: "career", type: "batting", stat: "home_runs", limit: 6 }),
      getSiteStats(),
      getMediaCount(),
      getAutoTrending(),
      getSeasons(),
      getTodayEditorial(month, day),
      getGameAnniversaries(month, day),
    ]);

  const latest = recent[0];
  const form = recent.slice(0, 10);
  const formW = form.filter((g) => metsView(g).won).length;

  const heroStats = [
    { num: stats?.seasons ?? 65, lbl: "Seasons" },
    { num: (stats?.players ?? 0).toLocaleString(), lbl: "Players" },
    { num: (stats?.games ?? 0).toLocaleString(), lbl: "Games" },
    { num: stats?.postseasons ?? 11, lbl: "Postseasons" },
    { num: mediaCount, lbl: "Media" },
  ];

  const maxHr = Math.max(1, ...hrLeaders.map((l) => Number(l.value) || 0));
  const todayLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const todayItems = [
    ...editorial.map((e) => ({ year: e.event_year, text: e.blurb ?? e.headline ?? "" })),
    ...anniv.map((g) => {
      const v = metsView(g);
      return { year: g.season, text: `${v.won ? "Beat" : "Lost to"} the ${v.oppName} ${v.metsScore}–${v.oppScore}` };
    }),
  ]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, 4);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hm-hero">
        <div className="hm-hero-inner">
          <div className="hm-hero-text">
            <h1>
              Ultimate <span>Mets</span>
            </h1>
            <p>65 seasons of Amazin'. Every player, game & moment — 1962 to today.</p>
            <div className="hm-stats">
              {heroStats.map((s) => (
                <div key={s.lbl}>
                  <div className="n">{s.num}</div>
                  <div className="l">{s.lbl}</div>
                </div>
              ))}
            </div>
            <p className="hm-stats-note">
              Complete franchise record
              {stats?.first_season && stats?.last_season
                ? ` · ${stats.first_season}–${stats.last_season}`
                : ""}{" "}
              · games &amp; players reflect completed regular-season play
            </p>
          </div>
          <div className="hm-faces">
            {hrLeaders.map((l) => (
              <Link key={l.player_id} href={`/players/${l.player_id}`} title={l.full_name ?? ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoOf(l)} alt={l.full_name ?? ""} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="hm-main">
        <div className="hm-col">
          {/* ---------- LATEST GAME ---------- */}
          {latest &&
            (() => {
              const v = metsView(latest);
              return (
                <Link href={`/games/${latest.game_pk}`} className="hm-game">
                  <div className="hm-game-head">
                    <span className={`hm-badge ${v.won ? "w" : "l"}`}>
                      {v.won ? "WIN" : "LOSS"}
                    </span>
                    <span className="hm-game-meta">
                      {latest.official_date} · {latest.venue_name}
                    </span>
                  </div>
                  <div className="hm-game-score">
                    <div className="hm-team">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={teamLogo(METS_ID)} alt="Mets" />
                      <span className="nm">Mets</span>
                      <span className="sc">{v.metsScore}</span>
                    </div>
                    <span className="hm-vs">{v.home ? "vs" : "@"}</span>
                    <div className="hm-team opp">
                      <span className="sc">{v.oppScore}</span>
                      <span className="nm">{v.oppName}</span>
                      {v.oppId && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={teamLogo(v.oppId)} alt={v.oppName ?? ""} />
                      )}
                    </div>
                  </div>
                  <div className="hm-form">
                    <span className="hm-form-lbl">Last 10: {formW}-{10 - formW}</span>
                    {form.map((g) => (
                      <span key={g.game_pk} className={`hm-pip ${metsView(g).won ? "w" : "l"}`}>
                        {metsView(g).won ? "W" : "L"}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })()}

          {/* ---------- CAREER HR LEADERS ---------- */}
          {hrLeaders.length > 0 && (
            <section className="hm-card">
              <div className="hm-card-head">
                <h2>Career Home Run Leaders</h2>
                <Link href="/leaders">All leaders →</Link>
              </div>
              <div className="hm-leaders">
                {hrLeaders.map((l, i) => {
                  const pct = Math.max(2, (Number(l.value) / maxHr) * 100);
                  return (
                    <Link key={l.player_id} href={`/players/${l.player_id}`} className="hm-leader">
                      <span className="hm-rank">{i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoOf(l)} alt={l.full_name ?? ""} className="hm-face-sm" />
                      <span className="hm-leader-name">{l.full_name}</span>
                      <span className="hm-leader-bar">
                        {/* gradient is sized to the full track so the orange
                            endpoint position maps to the absolute HR value */}
                        <span style={{ width: `${pct}%`, backgroundSize: `${(10000 / pct).toFixed(1)}% 100%` }} />
                      </span>
                      <span className="hm-leader-val">{l.value}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------- EXPLORE ---------- */}
          <section className="hm-explore">
            {EXPLORE.map((e) => (
              <Link key={e.key} href={e.href} className={`hm-tile ${e.key}`}>
                <span className="hm-tile-icon">{e.icon}</span>
                <span className="hm-tile-title">{e.title}</span>
                <span className="hm-tile-blurb">{e.blurb}</span>
              </Link>
            ))}
          </section>
        </div>

        {/* ---------- SIDEBAR ---------- */}
        <aside className="hm-side">
          <section className="hm-card">
            <div className="hm-card-head">
              <h2>Wins by Season</h2>
              <Link href="/seasons">History →</Link>
            </div>
            <ChartView
              type="bar"
              height={150}
              labels={[...seasons].reverse().map((s) => s.season)}
              datasets={[{ label: "Wins", data: [...seasons].reverse().map((s) => Number(s.wins)) }]}
            />
          </section>

          <section className="hm-card">
            <div className="hm-card-head">
              <h2>Trending</h2>
            </div>
            {trending.map((t, i) => (
              <Link key={i} href={t.href} className="hm-trend">
                <span className="hm-trend-name">{t.title}</span>
                <span className="hm-trend-meta">{t.subtitle}</span>
              </Link>
            ))}
          </section>

          {todayItems.length > 0 && (
            <section className="hm-card">
              <div className="hm-card-head">
                <h2>On {todayLabel}</h2>
              </div>
              {todayItems.map((h, i) => (
                <div key={i} className="hm-today">
                  <span className="yr">{h.year}</span>
                  <span className="tx">{h.text}</span>
                </div>
              ))}
            </section>
          )}
        </aside>
      </main>
    </>
  );
}
