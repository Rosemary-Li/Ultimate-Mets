"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerRow } from "@/lib/db";

/* ---------- helpers ---------- */

const GROUP_ORDER = [
  "Pitchers",
  "Catchers",
  "Infielders",
  "Outfielders",
  "Other",
] as const;
type Group = (typeof GROUP_ORDER)[number];

function groupOf(pt: string | null): Group {
  switch (pt) {
    case "Pitcher":
      return "Pitchers";
    case "Catcher":
      return "Catchers";
    case "Infielder":
      return "Infielders";
    case "Outfielder":
      return "Outfielders";
    default:
      return "Other";
  }
}

/** Which stat line a group shows — pitchers get rate/counting pitching stats. */
const isPitchers = (g: Group) => g === "Pitchers";

/** Legend shown in a group header: clarifies period (career) + which 3 stats. */
function groupLegend(g: Group): string {
  return isPitchers(g)
    ? "Career · ERA · W–L · SO"
    : "Career · AVG · HR · RBI";
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** ".271" style — drop the leading zero from a batting avg / obp / slg. */
function fmtAvg(v: string | null): string {
  if (v === null || v === undefined) return "—";
  const s = String(v);
  return s.startsWith("0") ? s.slice(1) : s;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function batThrow(p: PlayerRow): string {
  const b = p.bat_side?.[0];
  const t = p.pitch_hand?.[0];
  if (!b && !t) return "";
  return `${b ?? "?"}/${t ?? "?"}`;
}

/* ---------- avatar with initials fallback ---------- */

function Avatar({ p }: { p: PlayerRow }) {
  const [failed, setFailed] = useState(false);
  // photo_url is the resolved real photo (MLB or Wikimedia); null means we found
  // none anywhere, so show initials instead of MLB's grey silhouette.
  const showPhoto = !!p.photo_url && !failed;
  return (
    <span className="pl-photo">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.photo_url!}
          alt={p.full_name ?? ""}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="pl-initials">{initials(p.full_name)}</span>
      )}
    </span>
  );
}

/* ---------- stat line (position-aware: pitchers vs hitters) ---------- */

function StatLine({ p }: { p: PlayerRow }) {
  if (isPitchers(groupOf(p.position_type))) {
    const w = num(p.wins);
    const l = num(p.losses);
    return (
      <div className="pl-stats">
        <span><b>{p.era ?? "—"}</b> ERA</span>
        <span><b>{w === null && l === null ? "—" : `${w ?? 0}-${l ?? 0}`}</b> W-L</span>
        <span><b>{num(p.pit_so) ?? "—"}</b> SO</span>
      </div>
    );
  }
  return (
    <div className="pl-stats">
      <span><b>{fmtAvg(p.bat_avg)}</b> AVG</span>
      <span><b>{num(p.bat_hr) ?? "—"}</b> HR</span>
      <span><b>{num(p.bat_rbi) ?? "—"}</b> RBI</span>
    </div>
  );
}

/* ---------- sorting ---------- */

type Status = "current" | "all" | "historical";
type Pos = "all" | Group;
type Sort = "name" | "hr" | "rbi" | "avg" | "era" | "so" | "wins";
type Dir = "asc" | "desc";

const SORTS: { key: Sort; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "hr", label: "Home Runs" },
  { key: "rbi", label: "RBI" },
  { key: "avg", label: "Batting Avg" },
  { key: "era", label: "ERA (P)" },
  { key: "so", label: "Strikeouts (P)" },
  { key: "wins", label: "Wins (P)" },
];

// ascending comparators; direction is applied on top
const ASC: Record<Sort, (a: PlayerRow, b: PlayerRow) => number> = {
  name: (a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""),
  hr: (a, b) => (num(a.bat_hr) ?? -1) - (num(b.bat_hr) ?? -1),
  rbi: (a, b) => (num(a.bat_rbi) ?? -1) - (num(b.bat_rbi) ?? -1),
  avg: (a, b) => (num(a.bat_avg) ?? -1) - (num(b.bat_avg) ?? -1),
  era: (a, b) => (num(a.era) ?? 1e9) - (num(b.era) ?? 1e9),
  so: (a, b) => (num(a.pit_so) ?? -1) - (num(b.pit_so) ?? -1),
  wins: (a, b) => (num(a.wins) ?? -1) - (num(b.wins) ?? -1),
};

// sensible default direction when a sort key is first chosen
const defaultDir = (k: Sort): Dir => (k === "name" || k === "era" ? "asc" : "desc");

/* ---------- main ---------- */

export default function RosterView({ players }: { players: PlayerRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("current");
  const [pos, setPos] = useState<Pos>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [dir, setDir] = useState<Dir>("asc");
  const [view, setView] = useState<"card" | "list">("card");

  // pick a sort key (dropdown / first header click) — resets to its default dir
  const pickSort = (k: Sort) => {
    setSort(k);
    setDir(defaultDir(k));
  };
  // header click — same column flips direction, new column resets
  const toggleSort = (k: Sort) => {
    if (k === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else pickSort(k);
  };

  // status + search scope (drives the summary counts)
  const scoped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return players.filter((p) => {
      if (status === "current" && !p.is_current) return false;
      if (status === "historical" && p.is_current) return false;
      if (needle && !(p.full_name ?? "").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [players, q, status]);

  // counts per group, for the summary strip
  const counts = useMemo(() => {
    const c: Record<string, number> = { Total: scoped.length };
    for (const g of GROUP_ORDER) c[g] = 0;
    for (const p of scoped) c[groupOf(p.position_type)]++;
    return c;
  }, [scoped]);

  // + position filter + sort
  const filtered = useMemo(() => {
    let list = scoped;
    if (pos !== "all") list = list.filter((p) => groupOf(p.position_type) === pos);
    const cmp = ASC[sort];
    const signed = dir === "asc" ? cmp : (a: PlayerRow, b: PlayerRow) => -cmp(a, b);
    return [...list].sort(signed);
  }, [scoped, pos, sort, dir]);

  // group for card view (only when sorting by name — a stat sort reads as one
  // ranked list across positions)
  const grouped = useMemo(() => {
    if (sort !== "name") return null;
    const g: Record<string, PlayerRow[]> = {};
    for (const p of filtered) (g[groupOf(p.position_type)] ??= []).push(p);
    return g;
  }, [filtered, sort]);

  const SUMMARY: { key: Pos; label: string }[] = [
    { key: "all", label: "Total" },
    { key: "Pitchers", label: "Pitchers" },
    { key: "Catchers", label: "Catchers" },
    { key: "Infielders", label: "Infielders" },
    { key: "Outfielders", label: "Outfielders" },
  ];

  return (
    <div className="pl-wrap">
      <h1 className="pl-page-title">Players</h1>
      <p className="pl-page-sub">
        Searchable roster database — stat lines show{" "}
        <strong>career totals with the Mets</strong>, pulled from MLB and updated
        daily.
      </p>

      {/* summary strip */}
      <div className="pl-summary">
        {SUMMARY.map((s) => {
          const n = s.key === "all" ? counts.Total : counts[s.key];
          const active = pos === s.key;
          return (
            <button
              key={s.key}
              className={`pl-stat-chip ${active ? "active" : ""}`}
              onClick={() => setPos(active && s.key !== "all" ? "all" : s.key)}
            >
              <span className="pl-stat-num">{n}</span>
              <span className="pl-stat-lbl">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* controls */}
      <div className="pl-controls">
        <input
          className="pl-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
        />

        <div className="pl-seg">
          {(["current", "all", "historical"] as Status[]).map((s) => (
            <button
              key={s}
              className={status === s ? "active" : ""}
              onClick={() => setStatus(s)}
            >
              {s === "current" ? "Current" : s === "all" ? "All-time" : "Historical"}
            </button>
          ))}
        </div>

        <label className="pl-sort">
          Sort
          <select value={sort} onChange={(e) => pickSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="pl-seg pl-view">
          <button
            className={view === "card" ? "active" : ""}
            onClick={() => setView("card")}
            aria-label="Card view"
          >
            ▦ Cards
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            ☰ List
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="pl-empty">No players match these filters.</div>
      ) : view === "list" ? (
        <ListView rows={filtered} sort={sort} dir={dir} onSort={toggleSort} />
      ) : grouped ? (
        GROUP_ORDER.filter((g) => grouped[g]?.length).map((g) => (
          <section key={g}>
            <h2 className="pl-group-title">
              <span>
                {g} <span className="pl-count">{grouped[g].length}</span>
              </span>
              <span className="pl-group-legend">{groupLegend(g as Group)}</span>
            </h2>
            <CardGrid rows={grouped[g]} />
          </section>
        ))
      ) : (
        <>
          <h2 className="pl-group-title">
            <span>
              Ranked <span className="pl-count">{filtered.length}</span>
            </span>
            <span className="pl-group-legend">
              Career totals · hitters AVG·HR·RBI, pitchers ERA·W–L·SO
            </span>
          </h2>
          <CardGrid rows={filtered} />
        </>
      )}
    </div>
  );
}

/* ---------- card grid ---------- */

function CardGrid({ rows }: { rows: PlayerRow[] }) {
  return (
    <div className="pl-grid">
      {rows.map((p) => (
        <Link key={p.player_id} href={`/players/${p.player_id}`} className="pl-card">
          <Avatar p={p} />
          <div className="pl-card-body">
            <div className="pl-name-row">
              <span className="pl-name">{p.full_name}</span>
              {p.primary_number && <span className="pl-num">#{p.primary_number}</span>}
            </div>
            <div className="pl-meta">
              {[p.primary_position, batThrow(p)].filter(Boolean).join(" · ")}
              {p.is_current && <span className="pl-dot" title="On current roster" />}
            </div>
            <StatLine p={p} />
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ---------- list (table) view ---------- */

function ListView({
  rows,
  sort,
  dir,
  onSort,
}: {
  rows: PlayerRow[];
  sort: Sort;
  dir: Dir;
  onSort: (s: Sort) => void;
}) {
  const arrow = (s: Sort) => (sort === s ? (dir === "asc" ? " ▲" : " ▼") : "");
  const Th = ({ s, children }: { s?: Sort; children: React.ReactNode }) => (
    <th
      className={s ? `pl-th-sort ${sort === s ? "active" : ""}` : ""}
      onClick={s ? () => onSort(s) : undefined}
    >
      {children}
      {s && <span className="pl-th-arrow">{arrow(s)}</span>}
    </th>
  );
  return (
    <>
      <div className="pl-list-caption">
        Career totals with the Mets — click a column header to sort.
      </div>
      <div className="pl-list-wrap">
        <table className="pl-list">
          <thead>
            <tr>
              <Th s="name">Player</Th>
              <th>Pos</th>
              <th>#</th>
              <th>B/T</th>
              <Th s="avg">AVG</Th>
              <Th s="hr">HR</Th>
              <Th s="rbi">RBI</Th>
              <Th s="era">ERA</Th>
              <Th s="wins">W-L</Th>
              <Th s="so">SO</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const w = num(p.wins);
              const l = num(p.losses);
              return (
                <tr key={p.player_id}>
                  <td className="pl-list-name">
                    <Link href={`/players/${p.player_id}`}>
                      {p.full_name}
                      {p.is_current && <span className="pl-dot" />}
                    </Link>
                  </td>
                  <td>{p.primary_position ?? "—"}</td>
                  <td>{p.primary_number ?? "—"}</td>
                  <td>{batThrow(p) || "—"}</td>
                  <td>{fmtAvg(p.bat_avg)}</td>
                  <td>{num(p.bat_hr) ?? "—"}</td>
                  <td>{num(p.bat_rbi) ?? "—"}</td>
                  <td>{p.era ?? "—"}</td>
                  <td>{w === null && l === null ? "—" : `${w ?? 0}-${l ?? 0}`}</td>
                  <td>{num(p.pit_so) ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
