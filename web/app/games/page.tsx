import { getGameSeasons, getSeasonGameLog } from "@/lib/db";
import GameLog from "@/components/GameLog";
import ExportPanel from "@/components/ExportPanel";

export const dynamic = "force-dynamic";

export default async function GamesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: seasonParam } = await searchParams;
  const seasons = await getGameSeasons();
  const season =
    seasonParam && seasons.includes(Number(seasonParam))
      ? Number(seasonParam)
      : (seasons[0] ?? new Date().getFullYear());
  const games = await getSeasonGameLog(season);

  return (
    <div className="ga-wrap">
      <h1 className="ga-page-title">Games</h1>
      <p className="ga-page-sub">
        Full season game log — scores, decisions & running record, from MLB box
        scores.
      </p>
      <ExportPanel
        dataset="games"
        defaultStart={`${season}-01-01`}
        defaultEnd={`${season}-12-31`}
      />
      <GameLog season={season} seasons={seasons} games={games} />
    </div>
  );
}
