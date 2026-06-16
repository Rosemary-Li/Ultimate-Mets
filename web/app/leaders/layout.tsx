// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-leaders, preventing class-name collisions with other pages.
export default function LeadersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-leaders">{children}</div>;
}
