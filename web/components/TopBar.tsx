"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/nav";
import SignInModal from "./SignInModal";

export default function TopBar() {
  const pathname = usePathname();
  const [showSignIn, setShowSignIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();

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
          {status === "authenticated" ? (
            <div className="account">
              <button
                className="account-btn"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="account-avatar" />
                ) : (
                  <span className="account-avatar fallback">
                    {(session.user?.name ?? session.user?.email ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="account-menu" onMouseLeave={() => setMenuOpen(false)}>
                  <div className="account-id">
                    <div className="nm">{session.user?.name ?? "Mets fan"}</div>
                    <div className="em">{session.user?.email}</div>
                  </div>
                  <button onClick={() => signOut()}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="signin"
              onClick={() => setShowSignIn(true)}
              disabled={status === "loading"}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </header>
  );
}
