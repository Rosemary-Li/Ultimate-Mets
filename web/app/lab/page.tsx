"use client";

import { useEffect, useState } from "react";
import type { CareerBatting } from "@/lib/db";
import type { Player } from "@/lib/types";

const ROWS: { key: keyof CareerBatting; label: string; rate?: boolean }[] = [
  { key: "seasons", label: "Seasons" },
  { key: "games", label: "Games" },
  { key: "at_bats", label: "AB" },
  { key: "runs", label: "Runs" },
  { key: "hits", label: "Hits" },
  { key: "doubles", label: "2B" },
  { key: "triples", label: "3B" },
  { key: "home_runs", label: "HR" },
  { key: "rbi", label: "RBI" },
  { key: "walks", label: "BB" },
  { key: "strike_outs", label: "SO" },
  { key: "stolen_bases", label: "SB" },
  { key: "total_bases", label: "Total Bases" },
  { key: "avg", label: "AVG", rate: true },
  { key: "slg", label: "SLG", rate: true },
];

export default function LabPage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [players, setPlayers] = useState<CareerBatting[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Player[]>([]);

  // search players by name
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults((data.players ?? []).slice(0, 8));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // load career stats whenever the selection changes
  useEffect(() => {
    if (selected.length === 0) {
      setPlayers([]);
      return;
    }
    fetch(`/api/compare?ids=${selected.join(",")}`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []));
  }, [selected]);

  const add = (id: number) => {
    if (selected.length >= 4 || selected.includes(id)) return;
    setSelected([...selected, id]);
    setQ("");
    setResults([]);
  };
  const remove = (id: number) =>
    setSelected(selected.filter((x) => x !== id));

  // best value per row (all stats: higher is better)
  const bestFor = (key: keyof CareerBatting): number => {
    const vals = players.map((p) => Number(p[key] ?? -Infinity));
    return Math.max(...vals);
  };

  return (
    <div className="lab-wrap">
      <h1 className="lab-title">Lab — Player Comparison</h1>
      <p className="lab-sub">
        Stack up to 4 players and compare their career batting (Mets, regular
        season). Best in each row is highlighted.
      </p>

      <div className="lab-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            selected.length >= 4
              ? "Remove a player to add another"
              : "Search a player to add…"
          }
          disabled={selected.length >= 4}
        />
        {results.length > 0 && (
          <div className="lab-results">
            {results.map((p) => (
              <div
                key={p.player_id}
                className="lab-result"
                onClick={() => add(p.player_id)}
              >
                <span>{p.full_name}</span>
                <span className="pos">{p.primary_position}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <div className="lab-hint">
          Search and add players above to build a comparison.
        </div>
      ) : (
        <div className="lab-table-wrap">
          <table className="lab-table">
            <thead>
              <tr>
                <th></th>
                {players.map((p) => (
                  <th key={p.player_id}>
                    {p.full_name}
                    <span className="rm" onClick={() => remove(p.player_id)}>
                      ✕ remove
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = bestFor(row.key);
                return (
                  <tr key={String(row.key)}>
                    <td>{row.label}</td>
                    {players.map((p) => {
                      const raw = p[row.key];
                      const isBest =
                        players.length > 1 && Number(raw ?? -Infinity) === best;
                      return (
                        <td
                          key={p.player_id}
                          className={isBest ? "lab-best" : ""}
                        >
                          {raw ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
