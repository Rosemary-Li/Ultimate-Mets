"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

interface SignInModalProps {
  onClose: () => void;
}

export default function SignInModal({ onClose }: SignInModalProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const emailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    await signIn("resend", { email, redirect: false });
    setBusy(false);
    setSent(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2>Sign in to Ultimate Mets</h2>
        <p>Join the discussion and save your favorite players.</p>

        {sent ? (
          <div className="modal-sent">
            ✉️ Check <strong>{email}</strong> for a sign-in link.
          </div>
        ) : (
          <>
            <button
              className="modal-oauth"
              onClick={() => signIn("google")}
            >
              <span className="g">G</span> Continue with Google
            </button>

            <div className="modal-divider"><span>or</span></div>

            <form onSubmit={emailLink}>
              <label htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="modal-btn" type="submit" disabled={busy}>
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
