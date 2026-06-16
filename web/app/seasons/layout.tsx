// Wraps this route's content so its (global) stylesheet can be scoped under
// .route-seasons. The CSS is imported here so both the season index and the
// [year] detail inherit it.
import "./styles.css";

export default function SeasonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="route-seasons">{children}</div>;
}
