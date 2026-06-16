// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-media. The CSS is imported here for the media archive page.
import "./styles.css";

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-media">{children}</div>;
}
