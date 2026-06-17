import { getPlayersWithStats } from "@/lib/db";
import RosterView from "@/components/RosterView";

export const dynamic = "force-dynamic";

export default async function PlayersIndexPage() {
  const players = await getPlayersWithStats();
  return <RosterView players={players} />;
}
