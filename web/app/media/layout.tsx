// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-media, preventing class-name collisions with other pages.
export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-media">{children}</div>;
}
