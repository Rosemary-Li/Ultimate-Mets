"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import SignInModal from "./SignInModal";

export default function TopBar() {
  const pathname = usePathname();
  const [showSignIn, setShowSignIn] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="logo">
          ULTIMATE<span>METS</span>
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map((n) => (
            <Link
              key={n.section}
              href={n.href}
              className={isActive(n.href) ? "active" : ""}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="nav-tools">
          <input
            className="search"
            placeholder="Search players, seasons, games..."
          />
          <button className="signin" onClick={() => setShowSignIn(true)}>
            Sign In
          </button>
        </div>
      </div>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </header>
  );
}
