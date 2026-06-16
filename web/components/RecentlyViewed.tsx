"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentItem {
  section: string;
  title: string;
  href: string;
}

export default function RecentlyViewed() {
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mets_recent");
      setRecent(raw ? JSON.parse(raw) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  const clear = () => {
    localStorage.removeItem("mets_recent");
    setRecent([]);
  };

  return (
    <div className="side-card">
      <div className="side-title">
        <span>Recently Viewed</span>
        {recent.length > 0 && (
          <span className="clr" onClick={clear}>
            Clear
          </span>
        )}
      </div>
      {recent.length === 0 ? (
        <div className="recent-empty">
          No history yet.
          <div className="hint">
            Click around — pages you visit will appear here.
          </div>
        </div>
      ) : (
        recent.map((r, i) => (
          <Link href={r.href} key={i} className="recent-row">
            <span className={"recent-tag " + r.section}>{r.section}</span>
            <span className="recent-name">{r.title}</span>
          </Link>
        ))
      )}
    </div>
  );
}
