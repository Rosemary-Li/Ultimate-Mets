import Link from "next/link";
import { getPostseasonSeries } from "@/lib/db";
import type { PostseasonSeries } from "@/lib/types";

export const dynamic = "force-dynamic";

const SHORT: Record<string, string> = {
  F: "Wild Card",
  D: "NLDS",
  L: "NLCS",
  W: "World Series",
};

type Tier = "champ" | "pennant" | "nlcs" | "nlds" | "wc";

const TIER_LABEL: Record<Tier, string> = {
  champ: "World Series Champions",
  pennant: "NL Champions",
  nlcs: "Lost in NLCS",
  nlds: "Lost in NLDS",
  wc: "Lost in Wild Card",
};

/** Infer how far a postseason run got from the series actually played. */
function classify(series: PostseasonSeries[]): Tier {
  const ws = series.find((s) => s.game_type === "W");
  if (ws) return ws.mets_wins > ws.mets_losses ? "champ" : "pennant";
  const deepest = series.reduce((a, b) =>
    (b.round_order ?? 0) > (a.round_order ?? 0) ? b : a,
  );
  if (deepest.game_type === "L") return "nlcs";
  if (deepest.game_type === "D") return "nlds";
  return "wc";
}

export default async function PostseasonIndexPage() {
  const all = await getPostseasonSeries();
  const bySeason = new Map<number, PostseasonSeries[]>();
  for (const s of all) {
    const arr = bySeason.get(s.season) ?? [];
    arr.push(s);
    bySeason.set(s.season, arr);
  }
  const seasons = [...bySeason.keys()].sort((a, b) => b - a);

  // ----- franchise postseason summary -----
  let titles = 0;
  let pennants = 0;
  let wins = 0;
  let losses = 0;
  for (const s of all) {
    wins += Number(s.mets_wins);
    losses += Number(s.mets_losses);
  }
  for (const yr of seasons) {
    const t = classify(bySeason.get(yr)!);
    if (t === "champ") {
      titles++;
      pennants++;
    } else if (t === "pennant") {
      pennants++;
    }
  }

  const SUMMARY = [
    { num: seasons.length, label: "Appearances" },
    { num: titles, label: "World Series Titles" },
    { num: pennants, label: "NL Pennants" },
    { num: `${wins}–${losses}`, label: "Postseason Record" },
  ];

  return (
    <div className="ps-wrap">
      <h1 className="ps-page-title">Postseason</h1>
      <p className="ps-page-sub">
        Every Mets October run — how far each team got, series by series.
      </p>

      {seasons.length === 0 ? (
        <div className="ps-empty">
          No postseason games yet. Ingest October games (ingest_games.py over the
          postseason date range).
        </div>
      ) : (
        <>
          {/* summary strip */}
          <div className="ps-summary">
            {SUMMARY.map((s) => (
              <div key={s.label} className="ps-stat">
                <span className="ps-stat-num">{s.num}</span>
                <span className="ps-stat-lbl">{s.label}</span>
              </div>
            ))}
          </div>

          {/* legend */}
          <div className="ps-legend">
            <span><i className="sw champ" /> Champions</span>
            <span><i className="sw pennant" /> NL Pennant</span>
            <span><i className="sw nlcs" /> NLCS</span>
            <span><i className="sw nlds" /> NLDS</span>
            <span><i className="sw wc" /> Wild Card</span>
          </div>

          {/* dense, tiered year list */}
          <div className="ps-list">
            {seasons.map((yr) => {
              const series = bySeason
                .get(yr)!
                .slice()
                .sort((a, b) => (a.round_order ?? 0) - (b.round_order ?? 0));
              const tier = classify(series);
              const champ = tier === "champ";
              return (
                <Link
                  key={yr}
                  href={`/postseason/${yr}`}
                  className={`ps-row tier-${tier}`}
                >
                  <span className="ps-row-yr">{yr}</span>
                  <span className={`ps-tier tier-${tier}`}>
                    {champ && <span className="ps-trophy">🏆</span>}
                    {TIER_LABEL[tier]}
                  </span>

                  {/* progression ladder — only rounds actually played */}
                  <span className="ps-ladder">
                    {series.map((s, i) => {
                      const won = s.mets_wins > s.mets_losses;
                      const isChampWs = champ && s.game_type === "W";
                      return (
                        <span key={s.game_type} className="ps-step-wrap">
                          {i > 0 && <span className="ps-arrow">›</span>}
                          <span
                            className={`ps-step ${won ? "w" : "l"} ${
                              isChampWs ? "gold" : ""
                            }`}
                          >
                            <span className="ps-step-lbl">
                              {SHORT[s.game_type] ?? s.game_type}
                            </span>
                            <span className="ps-step-rec">
                              {s.mets_wins}–{s.mets_losses}
                            </span>
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
