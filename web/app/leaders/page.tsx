import Link from "next/link";
import { getLeaders, getSeasons, type LeaderScope, type LeaderType } from "@/lib/db";
import { headshot } from "@/lib/images";

export const dynamic = "force-dynamic";

interface Preset {
  key: string;
  label: string;
  scope: LeaderScope;
  type: LeaderType;
  stat: string;
}

const CAREER_PRESETS: Preset[] = [
  { key: "home_runs", label: "Home Runs", scope: "career", type: "batting", stat: "home_runs" },
  { key: "hits", label: "Hits", scope: "career", type: "batting", stat: "hits" },
  { key: "rbi", label: "RBI", scope: "career", type: "batting", stat: "rbi" },
  { key: "runs", label: "Runs", scope: "career", type: "batting", stat: "runs" },
  { key: "stolen_bases", label: "Stolen Bases", scope: "career", type: "batting", stat: "stolen_bases" },
  { key: "avg", label: "AVG", scope: "career", type: "batting", stat: "avg" },
  { key: "wins", label: "Wins", scope: "career", type: "pitching", stat: "wins" },
  { key: "strike_outs", label: "Strikeouts", scope: "career", type: "pitching", stat: "strike_outs" },
  { key: "saves", label: "Saves", scope: "career", type: "pitching", stat: "saves" },
  { key: "era", label: "ERA", scope: "career", type: "pitching", stat: "era" },
];

const STAT_LABEL: Record<string, string> = {
  home_runs: "HR", hits: "H", rbi: "RBI", runs: "R", stolen_bases: "SB",
  avg: "AVG", wins: "W", strike_outs: "SO", saves: "SV", era: "ERA",
};

function qs(p: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v != null) u.set(k, String(v));
  return "?" + u.toString();
}

export default async function LeadersPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; type?: string; stat?: string; season?: string }>;
}) {
  const sp = await searchParams;
  const scope = (sp.scope ?? "career") as LeaderScope;
  const type = (sp.type ?? "batting") as LeaderType;
  const stat = sp.stat ?? "home_runs";

  // latest season for the season-scoped presets
  const seasons = await getSeasons();
  const latest = seasons[0]?.season;
  const season = sp.season ? Number(sp.season) : latest;

  const seasonPresets: Preset[] = latest
    ? [
        { key: "s_hr", label: "HR", scope: "season", type: "batting", stat: "home_runs" },
        { key: "s_avg", label: "AVG", scope: "season", type: "batting", stat: "avg" },
        { key: "s_rbi", label: "RBI", scope: "season", type: "batting", stat: "rbi" },
        { key: "s_w", label: "Wins", scope: "season", type: "pitching", stat: "wins" },
        { key: "s_so", label: "Strikeouts", scope: "season", type: "pitching", stat: "strike_outs" },
        { key: "s_era", label: "ERA", scope: "season", type: "pitching", stat: "era" },
      ]
    : [];

  const rows = await getLeaders({ scope, type, stat, season, limit: 25 });
  const isActive = (p: Preset) =>
    p.scope === scope && p.type === type && p.stat === stat;

  // Inline bars for counting stats (rate stats like AVG/ERA don't get bars).
  const isCounting = !["avg", "slg", "era", "whip"].includes(stat);
  const maxVal = Math.max(1, ...rows.map((r) => Number(r.value) || 0));

  const chip = (p: Preset) => (
    <Link
      key={p.key}
      href={qs({ scope: p.scope, type: p.type, stat: p.stat, season: p.scope === "season" ? season : undefined })}
      className={`le-chip ${isActive(p) ? "active" : ""}`}
    >
      {p.label}
    </Link>
  );

  return (
    <div className="le-wrap">
      <h1 className="le-page-title">Leaders</h1>
      <p className="le-page-sub">
        Career &amp; single-season leaderboards — computed from per-game data,
        career boards cached as materialized views.
      </p>

      <div className="le-group">Career</div>
      <div className="le-presets">{CAREER_PRESETS.map(chip)}</div>

      {latest && (
        <>
          <div className="le-group">Season — {season}</div>
          <div className="le-presets">{seasonPresets.map(chip)}</div>
        </>
      )}

      {rows.length === 0 ? (
        <div className="le-empty">
          No leaderboard data. Populate stats (ingest_boxscores.py) and refresh the
          materialized views.
        </div>
      ) : (
        <div className="le-table-wrap">
          <table className="le-table">
            <thead>
              <tr>
                <th className="le-rank">#</th>
                <th>Player</th>
                <th className="le-pos">Pos</th>
                <th style={{ textAlign: "right" }}>
                  {scope === "season" ? `${season} ` : ""}
                  {STAT_LABEL[stat] ?? stat}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.player_id}>
                  <td className={`le-rank ${i < 3 ? "top" : ""}`}>{i + 1}</td>
                  <td>
                    <Link href={`/players/${r.player_id}`} className="le-player">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="le-face"
                        src={headshot(r.player_id)}
                        alt=""
                        loading="lazy"
                      />
                      <span>{r.full_name}</span>
                    </Link>
                  </td>
                  <td className="le-pos">{r.primary_position ?? "—"}</td>
                  <td>
                    <div className="le-valwrap">
                      {isCounting && (
                        <div className="le-track">
                          <div
                            className="le-bar"
                            style={{
                              width: `${(Number(r.value) / maxVal) * 100}%`,
                            }}
                          />
                        </div>
                      )}
                      <span className="le-num">{r.value}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="le-note">
        Career rate stats (AVG/ERA) require a minimum of playing time to qualify.
      </p>
    </div>
  );
}
