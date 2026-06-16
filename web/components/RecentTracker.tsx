"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

// Records the current route into localStorage so the home page's
// "Recently Viewed" card can show navigation history. Replaces the old
// per-page inline tracker script.
export default function RecentTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const item = NAV_ITEMS.find(
      (n) => n.section !== "home" && pathname.startsWith(n.href),
    );
    if (!item) return;
    try {
      const raw = localStorage.getItem("mets_recent");
      const list: Array<{ section: string; title: string; href: string }> = raw
        ? JSON.parse(raw)
        : [];
      const next = [
        { section: item.section, title: item.label, href: item.href },
        ...list.filter((r) => r.href !== item.href),
      ].slice(0, 8);
      localStorage.setItem("mets_recent", JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [pathname]);

  return null;
}
