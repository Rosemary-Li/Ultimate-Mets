"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { teamLogo } from "@/lib/images";
import type { GameLogRow } from "@/lib/db";

function view(g: GameLogRow) {
  const home = g.mets_is_home === 1;
  const ms = home ? g.home_score : g.away_score;
  const os = home ? g.away_score : g.home_score;
  const opp = home ? g.away_team_name : g.home_team_name;
  const oppId = home ? g.away_team_id : g.home_team_id;
  const won = g.mets_won === 1;
  return { home, ms, os, opp, oppId, won };
}

/** Short last name for the pitcher of record. */
function lastName(n: string | null): string {
  if (!n) return "";
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? p.slice(1).join(" ") : n;
}

type HA = "all" | "home" | "away";
type Res = "all" | "w" | "l";

export default function GameLog({
  season,
  seasons,
  games,
}: {
  season: number;
  seasons: number[];
  games: GameLogRow[];
}) {
  const router = useRouter();
  const [opp, setOpp] = useState("");
  const [ha, setHa] = useState<HA>("all");
  const [res, setRes] = useState<Res>("all");

  // distinct opponents in this season (for the dropdown)
  const opponents = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      const o = view(g).opp;
      if (o) set.add(o);
    }
    return [...set].sort();
  }, [games]);

  const filtersActive = opp !== "" || ha !== "all" || res !== "all";

  const rows = useMemo(() => {
    return games.filter((g) => {
      const v = view(g);
      if (opp && v.opp !== opp) return false;
      if (ha === "home" && !v.home) return false;
      if (ha === "away" && v.home) return false;
      if (res === "w" && !v.won) return false;
      if (res === "l" && v.won) return false;
      return true;
    });
  }, [games, opp, ha, res]);

  // streaks across the full season (badge on the most-recent game of each run)
  const streak = useMemo(() => {
    const m: Record<number, string> = {};
    let i = 0;
    while (i < games.length) {
      let j = i;
      while (j < games.length && games[j].mets_won === games[i].mets_won) j++;
      const len = j - i;
      if (len >= 2) m[games[i].game_pk] = (games[i].mets_won ? "W" : "L") + len;
      i = j;
    }
    return m;
  }, [games]);

  // season + recent-form summary (running record lives on the newest row)
  const finalW = games[0]?.running_w ?? 0;
  const finalL = games[0]?.running_l ?? 0;
  const last10 = games.slice(0, 10);
  const last10W = last10.filter((g) => g.mets_won === 1).length;

  return (
    <>
      {/* filter bar */}
      <div className="ga-filters">
        <label className="ga-field">
          Season
          <select
            value={season}
            onChange={(e) => router.push(`/games?season=${e.target.value}`)}
          >
            {seasons.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="ga-field">
          Opponent
          <select value={opp} onChange={(e) => setOpp(e.target.value)}>
            <option value="">All opponents</option>
            {opponents.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <div className="ga-seg">
          {(["all", "home", "away"] as HA[]).map((k) => (
            <button key={k} className={ha === k ? "active" : ""} onClick={() => setHa(k)}>
              {k === "all" ? "All" : k === "home" ? "Home" : "Away"}
            </button>
          ))}
        </div>

        <div className="ga-seg">
          {(["all", "w", "l"] as Res[]).map((k) => (
            <button key={k} className={res === k ? "active" : ""} onClick={() => setRes(k)}>
              {k === "all" ? "W/L" : k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* summary */}
      <div className="ga-summary">
        <span className="ga-sum-season">{season}</span>
        <span className="ga-sum-rec">{finalW}–{finalL}</span>
        <span className="ga-sum-sub">
          Last 10: {last10W}–{last10.length - last10W}
        </span>
        <span className="ga-sum-count">
          {filtersActive ? `${rows.length} of ${games.length} games` : `${games.length} games`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="ga-empty">
          {games.length === 0
            ? "No games for this season yet. Run ingest_games.py + ingest_boxscores.py."
            : "No games match these filters."}
        </div>
      ) : (
        <div className="ga-log-wrap">
          <table className="ga-log">
            <thead>
              <tr>
                <th className="c-date">Date</th>
                <th className="c-res"></th>
                <th className="c-ha"></th>
                <th className="c-opp">Opponent</th>
                <th className="c-score">Score</th>
                <th className="c-dec">Decision</th>
                <th className="c-rec">Record</th>
                <th className="c-streak"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const v = view(g);
                const dec = v.won
                  ? { tag: "W", name: lastName(g.win_pitcher), cls: "w" }
                  : { tag: "L", name: lastName(g.loss_pitcher), cls: "l" };
                const sv = v.won && g.save_pitcher ? lastName(g.save_pitcher) : "";
                const sk = !filtersActive ? streak[g.game_pk] : undefined;
                return (
                  <tr key={g.game_pk} className={`ga-lrow ${v.won ? "w" : "l"}`}>
                    <td className="c-date">
                      <Link href={`/games/${g.game_pk}`}>{g.official_date}</Link>
                    </td>
                    <td className="c-res">
                      <span className={`ga-chip ${v.won ? "w" : "l"}`}>
                        {v.won ? "W" : "L"}
                      </span>
                    </td>
                    <td className="c-ha">
                      <span className={`ga-ha ${v.home ? "home" : "away"}`}>
                        {v.home ? "vs" : "@"}
                      </span>
                    </td>
                    <td className="c-opp">
                      <Link href={`/games/${g.game_pk}`} className="ga-opp">
                        {v.oppId && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={teamLogo(v.oppId)} alt="" />
                        )}
                        <span>{v.opp}</span>
                      </Link>
                    </td>
                    <td className="c-score">
                      <span className={`ga-sc ${v.won ? "w" : "l"}`}>
                        {v.ms}–{v.os}
                      </span>
                    </td>
                    <td className="c-dec">
                      {dec.name ? (
                        <span className="ga-dec">
                          <b className={dec.cls}>{dec.tag}</b> {dec.name}
                          {sv && <span className="ga-sv"> · SV {sv}</span>}
                        </span>
                      ) : (
                        <span className="ga-muted">—</span>
                      )}
                    </td>
                    <td className="c-rec">
                      {g.running_w}–{g.running_l}
                    </td>
                    <td className="c-streak">
                      {sk && <span className={`ga-streak ${sk[0] === "W" ? "w" : "l"}`}>{sk}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
