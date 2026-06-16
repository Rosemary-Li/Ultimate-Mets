// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-leaders. The CSS is imported here for the leaderboards page.
import "./styles.css";

export default function LeadersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-leaders">{children}</div>;
}
