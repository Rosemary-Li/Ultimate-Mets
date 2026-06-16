// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-games. The CSS is imported here so both the games index and the
// [gamePk] detail inherit it.
import "./styles.css";

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-games">{children}</div>;
}
