// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-postseason, preventing class-name collisions with other pages.
export default function PostseasonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-postseason">{children}</div>;
}
