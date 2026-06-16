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

function outcome(series: PostseasonSeries[]): { label: string; champ: boolean } {
  const ws = series.find((s) => s.game_type === "W");
  if (ws && ws.mets_wins > ws.mets_losses)
    return { label: "World Series Champions", champ: true };
  const last = series[series.length - 1];
  if (last && last.mets_wins > last.mets_losses && last.game_type === "L")
    return { label: "NL Pennant", champ: true };
  return {
    label: last ? `Eliminated in ${SHORT[last.game_type] ?? "playoffs"}` : "—",
    champ: false,
  };
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

  return (
    <div className="ps-wrap">
      <h1 className="ps-page-title">Postseason</h1>
      <p className="ps-page-sub">
        Every Mets postseason run in the database — series by series.
      </p>

      {seasons.length === 0 ? (
        <div className="ps-empty">
          No postseason games yet. Ingest October games (ingest_games.py over the
          postseason date range).
        </div>
      ) : (
        seasons.map((yr) => {
          const series = bySeason.get(yr)!;
          const o = outcome(series);
          return (
            <Link key={yr} href={`/postseason/${yr}`} className="ps-card" style={{ display: "block" }}>
              <div>
                <span className="ps-yr">{yr}</span>
                <span className={`ps-outcome ${o.champ ? "champ" : "out"}`}>
                  {o.label}
                </span>
              </div>
              <div className="ps-rounds">
                {series.map((s) => {
                  const won = s.mets_wins > s.mets_losses;
                  return (
                    <span key={s.game_type} className={`ps-round ${won ? "w" : "l"}`}>
                      <span className="lbl">{SHORT[s.game_type] ?? s.game_type}</span>
                      <span className="rec">
                        {s.mets_wins}–{s.mets_losses}
                      </span>
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
