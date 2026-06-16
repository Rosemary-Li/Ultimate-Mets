// Shared navigation config. Single source of truth for the top-bar links and the
// section accent colors used across the home page, "recently viewed", etc.
// Replaces the old per-file NAV_HREF maps that pointed at *.html files.

export type SectionKey =
  | "home"
  | "players"
  | "seasons"
  | "games"
  | "leaders"
  | "postseason"
  | "lab"
  | "media";

export interface NavItem {
  label: string;
  href: string;
  section: SectionKey;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", section: "home" },
  { label: "Players", href: "/players", section: "players" },
  { label: "Seasons", href: "/seasons", section: "seasons" },
  { label: "Games", href: "/games", section: "games" },
  { label: "Leaders", href: "/leaders", section: "leaders" },
  { label: "Postseason", href: "/postseason", section: "postseason" },
  { label: "Lab", href: "/lab", section: "lab" },
  { label: "Media", href: "/media", section: "media" },
];

// Convenience map: section -> href
export const HREF: Record<SectionKey, string> = NAV_ITEMS.reduce(
  (acc, item) => ({ ...acc, [item.section]: item.href }),
  {} as Record<SectionKey, string>,
);
