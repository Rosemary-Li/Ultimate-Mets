// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-postseason. The CSS is imported here for the index and [year] detail.
import "./styles.css";

export default function PostseasonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-postseason">{children}</div>;
}
