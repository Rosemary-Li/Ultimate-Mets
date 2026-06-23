"use client";

import { useState } from "react";
import type { Dataset } from "@/lib/export";

type Props = {
  dataset: Dataset;
  /** games: default date range (YYYY-MM-DD) */
  defaultStart?: string;
  defaultEnd?: string;
  /** seasons: year range bounds */
  minYear?: number;
  maxYear?: number;
};

/**
 * Download control: pick the coverage (date range for games, year range for
 * seasons, batting/pitching for leaders), then export as CSV or Excel. Hits the
 * /api/export endpoint, which streams the file as an attachment.
 */
export default function ExportPanel({
  dataset,
  defaultStart = "2026-01-01",
  defaultEnd = "2026-12-31",
  minYear = 1962,
  maxYear = 2026,
}: Props) {
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [from, setFrom] = useState(minYear);
  const [to, setTo] = useState(maxYear);
  const [type, setType] = useState<"batting" | "pitching">("batting");

  function href(format: "csv" | "xlsx") {
    const p = new URLSearchParams({ dataset, format });
    if (dataset === "games") {
      p.set("start", start);
      p.set("end", end);
    } else if (dataset === "seasons") {
      p.set("from", String(from));
      p.set("to", String(to));
    } else if (dataset === "leaders") {
      p.set("type", type);
    }
    return `/api/export?${p.toString()}`;
  }

  function download(format: "csv" | "xlsx") {
    window.location.assign(href(format));
  }

  return (
    <div className="export-panel">
      <span className="export-title">⤓ Download data</span>

      {dataset === "games" && (
        <span className="export-fields">
          <label>
            From
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </span>
      )}

      {dataset === "seasons" && (
        <span className="export-fields">
          <label>
            From
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
            />
          </label>
          <label>
            To
            <input
              type="number"
              min={minYear}
              max={maxYear}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
            />
          </label>
        </span>
      )}

      {dataset === "leaders" && (
        <span className="export-fields">
          <label>
            Stats
            <select value={type} onChange={(e) => setType(e.target.value as "batting" | "pitching")}>
              <option value="batting">Batting</option>
              <option value="pitching">Pitching</option>
            </select>
          </label>
        </span>
      )}

      <span className="export-buttons">
        <button type="button" onClick={() => download("csv")}>CSV</button>
        <button type="button" onClick={() => download("xlsx")}>Excel</button>
      </span>
    </div>
  );
}
