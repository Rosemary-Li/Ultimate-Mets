// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-games, preventing class-name collisions with other pages.
export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-games">{children}</div>;
}
