"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import ChartView from "@/components/ChartView";
import { headshot } from "@/lib/images";

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
  noBar?: boolean;
}

const BATTING_ROWS: Row[] = [
  { key: "seasons", label: "Seasons", noBest: true, noBar: true },
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
  { key: "seasons", label: "Seasons", noBest: true, noBar: true },
  { key: "games", label: "Games" },
  { key: "innings_pitched", label: "IP", noBest: true, noBar: true },
  { key: "wins", label: "Wins" },
  { key: "losses", label: "Losses", lowerBetter: true },
  { key: "strike_outs", label: "SO" },
  { key: "saves", label: "Saves" },
  { key: "earned_runs", label: "ER", lowerBetter: true },
  { key: "era", label: "ERA", lowerBetter: true },
];

// the few rows shown in the faded empty-state preview skeleton
const PREVIEW_ROWS: Record<Mode, string[]> = {
  batting: ["AVG", "HR", "RBI", "Hits", "SLG"],
  pitching: ["ERA", "Wins", "SO", "Saves", "IP"],
};

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
    { label: "Modern Core", names: ["Pete Alonso", "Francisco Lindor", "Brandon Nimmo"] },
    { label: "Franchise Bats", names: ["Darryl Strawberry", "David Wright", "Jeff McNeil"] },
  ],
  pitching: [
    { label: "Current Staff", names: ["Sean Manaea", "David Peterson", "Tylor Megill"] },
    { label: "All-Time Arms", names: ["Tom Seaver", "Dwight Gooden", "Jacob deGrom"] },
  ],
};

/* ---------- headshot with initials fallback ---------- */
function Face({ id, name, cls }: { id: number; name: string; cls: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w, i, a) => (i === 0 || i === a.length - 1 ? w[0] : ""))
    .join("")
    .toUpperCase();
  if (failed) return <span className={`${cls} lab-face-fb`}>{initials || "?"}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={cls} src={headshot(id)} alt={name} onError={() => setFailed(true)} />
  );
}

export default function LabPage() {
  const [mode, setMode] = useState<Mode>("batting");
  const [selected, setSelected] = useState<Picked[]>([]);
  const [data, setData] = useState<Record<number, Record<string, unknown>>>({});
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [resolved, setResolved] = useState<{ label: string; players: Picked[] }[]>([]);

  const rows = mode === "batting" ? BATTING_ROWS : PITCHING_ROWS;

  // typeahead search
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

  // resolve sample matchups → real ids (for headshots on the cards + preview)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: { label: string; players: Picked[] }[] = [];
      for (const m of SUGGESTIONS[mode]) {
        const players: Picked[] = [];
        for (const name of m.names) {
          const res = await fetch(`/api/players?q=${encodeURIComponent(name)}`);
          const json = await res.json();
          const list: Player[] = json.players ?? [];
          const p = list.find((x) => x.full_name === name) ?? list[0];
          if (p)
            players.push({
              id: Number(p.player_id),
              name: p.full_name ?? name,
              position: p.primary_position,
            });
        }
        out.push({ label: m.label, players });
      }
      if (!cancelled) setResolved(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

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

  // per-row max magnitude, for the inline bars
  const maxFor = (row: Row): number => {
    const vals = selected
      .map((s) => data[s.id]?.[row.key])
      .filter((v) => v != null)
      .map(Number)
      .filter(Number.isFinite)
      .map(Math.abs);
    return vals.length ? Math.max(...vals) : 0;
  };

  const noData = selected.filter((s) => !data[s.id]);

  return (
    <div className="lab-wrap">
      <h1 className="lab-title">Lab — Player Comparison</h1>
      <p className="lab-sub">
        Stack 2–4 Mets and compare full-career totals side by side — the
        slash line (AVG / SLG), power & production (HR, RBI, TB) for hitters, or
        ERA, wins, strikeouts & saves for pitchers. The leader in each row is
        highlighted in <span className="lab-sub-hi">orange</span>.
      </p>

      {/* ===== console: mode tabs + active picks + search in one panel ===== */}
      <div className="lab-console">
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
          {selected.length > 0 && (
            <button className="lab-clear" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        <div className="lab-slots">
          {selected.map((s) => (
            <span key={s.id} className="lab-slot">
              <Face id={s.id} name={s.name} cls="lab-slot-face" />
              {s.name}
              <button onClick={() => remove(s.id)} aria-label="Remove">
                ✕
              </button>
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
                    <div
                      key={p.player_id}
                      className="lab-result"
                      onClick={() => add(p)}
                    >
                      <span>{p.full_name}</span>
                      <span className="pos">{p.primary_position}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selected.length === 0 ? (
        /* ===== empty state = tool preview ===== */
        <div className="lab-preview-block">
          <div className="lab-preview-card">
            <span className="lab-preview-badge">Preview</span>
            <table className="lab-table lab-table-ghost">
              <thead>
                <tr>
                  <th></th>
                  {(resolved[0]?.players ?? []).map((p) => (
                    <th key={p.id}>
                      <Face id={p.id} name={p.name} cls="lab-th-face" />
                      <div>{p.name}</div>
                    </th>
                  ))}
                  {resolved.length === 0 &&
                    [0, 1].map((i) => (
                      <th key={i}>
                        <span className="lab-th-face lab-face-fb">⚾</span>
                        <div>Player {i + 1}</div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {PREVIEW_ROWS[mode].map((label) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {Array.from({
                      length: resolved[0]?.players?.length || 2,
                    }).map((_, i) => (
                      <td key={i} className="lab-cell">
                        <span
                          className="lab-bar lab-bar-ghost"
                          style={{ width: `${30 + ((i * 37 + label.length * 11) % 60)}%` }}
                        />
                        <span className="lab-ghost-num" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="lab-preview-overlay">
              <div className="lab-preview-cta-title">
                See how any Mets stack up
              </div>
              <p>
                Search a player above, or load a ready-made matchup to see the
                full comparison — every stat, with the leader highlighted.
              </p>
              {resolved[0] && (
                <button
                  className="lab-preview-cta"
                  onClick={() => setSelected(resolved[0].players)}
                >
                  Load “{resolved[0].label}” →
                </button>
              )}
            </div>
          </div>

          <div className="lab-suggest-head">Or jump into a matchup</div>
          <div className="lab-suggest">
            {resolved.map((m) => (
              <button
                key={m.label}
                className="lab-suggest-card"
                onClick={() => setSelected(m.players)}
              >
                <span className="lab-suggest-faces">
                  {m.players.map((p) => (
                    <Face key={p.id} id={p.id} name={p.name} cls="lab-suggest-face" />
                  ))}
                </span>
                <span className="lab-suggest-meta">
                  <span className="lab-suggest-label">{m.label}</span>
                  <span className="lab-suggest-names">
                    {m.players.map((p) => p.name.split(" ").slice(-1)[0]).join(" · ")}
                  </span>
                </span>
                <span className="lab-suggest-go">Compare →</span>
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
                      <Face id={s.id} name={s.name} cls="lab-th-face" />
                      <div>{s.name}</div>
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
                  const rowMax = maxFor(row);
                  return (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {selected.map((s) => {
                        const raw = data[s.id]?.[row.key] as
                          | string
                          | number
                          | undefined;
                        const n = Number(raw);
                        const isBest =
                          best != null &&
                          selected.length > 1 &&
                          raw != null &&
                          n === best;
                        const showBar =
                          !row.noBar &&
                          rowMax > 0 &&
                          raw != null &&
                          Number.isFinite(n);
                        return (
                          <td
                            key={s.id}
                            className={`lab-cell ${isBest ? "lab-best" : ""}`}
                          >
                            {showBar && (
                              <span
                                className={`lab-bar ${isBest ? "lab-bar-best" : ""}`}
                                style={{
                                  width: `${Math.max(4, (Math.abs(n) / rowMax) * 100)}%`,
                                }}
                              />
                            )}
                            <span className="lab-val">
                              {(raw as React.ReactNode) ?? "—"}
                            </span>
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
