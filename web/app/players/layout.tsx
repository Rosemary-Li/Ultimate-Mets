// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-players, preventing class-name collisions with other pages.
export default function PlayersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-players">{children}</div>;
}
