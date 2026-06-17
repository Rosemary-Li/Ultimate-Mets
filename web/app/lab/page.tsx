"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import ChartView from "@/components/ChartView";

type Mode = "batting" | "pitching";

interface Picked {
  id: number;
  name: string;
  position: string | null;
}

interface Row {
  key: string;
  label: string;
  lowerBetter?: boolean;
  noBest?: boolean;
}

const BATTING_ROWS: Row[] = [
  { key: "seasons", label: "Seasons", noBest: true },
  { key: "games", label: "Games" },
  { key: "at_bats", label: "AB" },
  { key: "runs", label: "Runs" },
  { key: "hits", label: "Hits" },
  { key: "doubles", label: "2B" },
  { key: "triples", label: "3B" },
  { key: "home_runs", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "walks", label: "BB" },
  { key: "strike_outs", label: "SO", noBest: true },
  { key: "stolen_bases", label: "SB" },
  { key: "total_bases", label: "Total Bases" },
  { key: "avg", label: "AVG" },
  { key: "slg", label: "SLG" },
];

const PITCHING_ROWS: Row[] = [
  { key: "seasons", label: "Seasons", noBest: true },
  { key: "games", label: "Games" },
  { key: "innings_pitched", label: "IP", noBest: true },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses", lowerBetter: true },
  { key: "strike_outs", label: "SO" },
  { key: "saves", label: "Saves" },
  { key: "earned_runs", label: "ER", lowerBetter: true },
  { key: "era", label: "ERA", lowerBetter: true },
];

const CHART: Record<Mode, { keys: string[]; labels: string[] }> = {
  batting: {
    keys: ["home_runs", "rbi", "hits", "stolen_bases", "walks", "doubles"],
    labels: ["HR", "RBI", "Hits", "SB", "BB", "2B"],
  },
  pitching: {
    keys: ["wins", "losses", "strike_outs", "saves"],
    labels: ["W", "L", "SO", "SV"],
  },
};

const SUGGESTIONS: Record<Mode, { label: string; names: string[] }[]> = {
  batting: [
    { label: "Alonso · Lindor · Nimmo", names: ["Pete Alonso", "Francisco Lindor", "Brandon Nimmo"] },
    { label: "Strawberry · Wright · McNeil", names: ["Darryl Strawberry", "David Wright", "Jeff McNeil"] },
  ],
  pitching: [
    { label: "Manaea · Peterson · Megill", names: ["Sean Manaea", "David Peterson", "Tylor Megill"] },
    { label: "Seaver · Gooden · deGrom", names: ["Tom Seaver", "Dwight Gooden", "Jacob deGrom"] },
  ],
};

export default function LabPage() {
  const [mode, setMode] = useState<Mode>("batting");
  const [selected, setSelected] = useState<Picked[]>([]);
  const [data, setData] = useState<Record<number, Record<string, unknown>>>({});
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Player[]>([]);

  const rows = mode === "batting" ? BATTING_ROWS : PITCHING_ROWS;

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults((json.players ?? []).slice(0, 8));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // (re)load comparison data whenever the selection OR mode changes
  useEffect(() => {
    if (selected.length === 0) {
      setData({});
      return;
    }
    fetch(`/api/compare?type=${mode}&ids=${selected.map((s) => s.id).join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        const map: Record<number, Record<string, unknown>> = {};
        for (const row of d.players ?? []) map[Number(row.player_id)] = row;
        setData(map);
      });
  }, [selected, mode]);

  const add = (p: Player) => {
    const id = Number(p.player_id);
    if (selected.length >= 4 || selected.some((s) => s.id === id)) return;
    setSelected([
      ...selected,
      { id, name: p.full_name ?? String(id), position: p.primary_position },
    ]);
    setQ("");
    setResults([]);
  };
  const remove = (id: number) => setSelected(selected.filter((s) => s.id !== id));
  const clearAll = () => setSelected([]);

  async function loadMatchup(names: string[]) {
    const picks: Picked[] = [];
    for (const name of names.slice(0, 4)) {
      const res = await fetch(`/api/players?q=${encodeURIComponent(name)}`);
      const json = await res.json();
      const list: Player[] = json.players ?? [];
      const p = list.find((x) => x.full_name === name) ?? list[0];
      if (p)
        picks.push({
          id: Number(p.player_id),
          name: p.full_name ?? name,
          position: p.primary_position,
        });
    }
    setSelected(picks);
  }

  const bestFor = (row: Row): number | null => {
    if (row.noBest) return null;
    const vals = selected
      .map((s) => data[s.id]?.[row.key])
      .filter((v) => v != null)
      .map(Number)
      .filter(Number.isFinite);
    if (!vals.length) return null;
    return row.lowerBetter ? Math.min(...vals) : Math.max(...vals);
  };

  const noData = selected.filter((s) => !data[s.id]);

  return (
    <div className="lab-wrap">
      <h1 className="lab-title">Lab — Player Comparison</h1>
      <p className="lab-sub">
        Stack 2–4 Mets and compare them side by side. Best in each row is
        highlighted in orange.
      </p>

      {/* mode toggle */}
      <div className="lab-modes">
        {(["batting", "pitching"] as Mode[]).map((m) => (
          <button
            key={m}
            className={`lab-mode ${mode === m ? "active" : ""}`}
            onClick={() => {
              if (m !== mode) {
                setMode(m);
                setSelected([]);
              }
            }}
          >
            {m === "batting" ? "⚾ Batting" : "🥎 Pitching"}
          </button>
        ))}
      </div>

      {/* picked players as slots */}
      <div className="lab-slots">
        {selected.map((s) => (
          <span key={s.id} className="lab-slot">
            {s.name}
            <button onClick={() => remove(s.id)}>✕</button>
          </span>
        ))}
        {selected.length < 4 && (
          <div className="lab-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                selected.length === 0
                  ? "Search a player to add…"
                  : "+ Add another"
              }
            />
            {results.length > 0 && (
              <div className="lab-results">
                {results.map((p) => (
                  <div key={p.player_id} className="lab-result" onClick={() => add(p)}>
                    <span>{p.full_name}</span>
                    <span className="pos">{p.primary_position}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {selected.length > 0 && (
          <button className="lab-clear" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {selected.length === 0 ? (
        <div className="lab-empty">
          <div className="lab-empty-icon">⚖️</div>
          <div className="lab-empty-title">
            Compare {mode === "batting" ? "hitters" : "pitchers"} side by side
          </div>
          <p>
            Search above to add 2–4 players, or jump in with a sample matchup:
          </p>
          <div className="lab-suggest">
            {SUGGESTIONS[mode].map((m) => (
              <button key={m.label} onClick={() => loadMatchup(m.names)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {noData.length > 0 && (
            <div className="lab-warn">
              No {mode} data for {noData.map((s) => s.name).join(", ")} —
              {mode === "batting"
                ? " pitchers and not-yet-ingested seasons show as “—”."
                : " position players and not-yet-ingested seasons show as “—”."}
            </div>
          )}

          <div className="lab-chart-card">
            <ChartView
              type="bar"
              height={260}
              labels={CHART[mode].labels}
              datasets={selected.map((s) => ({
                label: s.name,
                data: CHART[mode].keys.map((k) => Number(data[s.id]?.[k] ?? 0)),
              }))}
            />
          </div>

          <div className="lab-table-wrap">
            <table className="lab-table">
              <thead>
                <tr>
                  <th></th>
                  {selected.map((s) => (
                    <th key={s.id}>
                      {s.name}
                      <span className="rm" onClick={() => remove(s.id)}>
                        ✕ remove
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const best = bestFor(row);
                  return (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {selected.map((s) => {
                        const raw = data[s.id]?.[row.key] as
                          | string
                          | number
                          | undefined;
                        const isBest =
                          best != null &&
                          selected.length > 1 &&
                          raw != null &&
                          Number(raw) === best;
                        return (
                          <td key={s.id} className={isBest ? "lab-best" : ""}>
                            {(raw as React.ReactNode) ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
