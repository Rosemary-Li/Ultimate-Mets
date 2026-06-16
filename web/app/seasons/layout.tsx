// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-seasons, preventing class-name collisions with other pages.
export default function SeasonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-seasons">{children}</div>;
}
