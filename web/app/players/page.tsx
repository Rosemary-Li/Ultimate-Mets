import Link from "next/link";
import { getPlayers } from "@/lib/db";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    parts.length === 1
      ? name.slice(0, 2)
      : parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
}

export default async function PlayersIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const players = await getPlayers(q);
  const current = players.filter((p) => p.is_current);
  const historical = players.filter((p) => !p.is_current);

  const grid = (list: Player[]) => (
    <div className="pl-grid">
      {list.map((p: Player) => (
        <Link
          key={p.player_id}
          href={`/players/${p.player_id}`}
          className="pl-card"
        >
          <span className="pl-avatar">{initials(p.full_name)}</span>
          <span>
            <div className="pl-name">{p.full_name}</div>
            <div className="pl-meta">
              {[p.primary_position, p.primary_number && `#${p.primary_number}`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="pl-wrap">
      <h1 className="pl-page-title">Players</h1>
      <p className="pl-page-sub">
        Every Met in the database — pulled from MLB rosters, updated daily.
      </p>

      <form method="GET">
        <input
          className="pl-search"
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search players by name…"
        />
      </form>

      {players.length === 0 ? (
        <div className="pl-empty">
          {q
            ? `No players matching “${q}”.`
            : "No players yet. Run the ingest pipeline (ingest_players.py) to populate this list."}
        </div>
      ) : (
        <>
          {current.length > 0 && (
            <>
              <h2 className="pl-group-title">
                Current Roster <span className="pl-count">{current.length}</span>
              </h2>
              {grid(current)}
            </>
          )}
          {historical.length > 0 && (
            <>
              <h2 className="pl-group-title">
                Historical Players{" "}
                <span className="pl-count">{historical.length}</span>
              </h2>
              {grid(historical)}
            </>
          )}
        </>
      )}
    </div>
  );
}
