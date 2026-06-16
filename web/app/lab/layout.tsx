// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-lab. The CSS is imported here for the comparison tool.
import "./styles.css";

export default function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-lab">{children}</div>;
}
