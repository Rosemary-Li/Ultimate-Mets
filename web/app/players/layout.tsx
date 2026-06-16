// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-players, preventing class-name collisions with other pages. The CSS is
// imported here so both the roster index and the [playerId] profile inherit it.
import "./styles.css";

export default function PlayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-players">{children}</div>;
}
