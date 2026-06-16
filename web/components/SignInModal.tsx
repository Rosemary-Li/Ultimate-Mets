"use client";

interface SignInModalProps {
  onClose: () => void;
  onSignIn?: (email: string) => void;
}

export default function SignInModal({ onClose, onSignIn }: SignInModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2>Sign in to Ultimate Mets</h2>
        <p>Save comparisons, custom views, and your favorite players.</p>
        <label htmlFor="signin-email">Email</label>
        <input id="signin-email" type="email" placeholder="you@example.com" />
        <label htmlFor="signin-pw">Password</label>
        <input id="signin-pw" type="password" placeholder="••••••••" />
        <button
          className="modal-btn"
          onClick={() => {
            onSignIn?.("you@example.com");
            onClose();
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
