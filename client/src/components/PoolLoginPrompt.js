import React from "react";
import { Link } from "react-router-dom";

export default function PoolLoginPrompt({
  accentColor = "var(--primary-navy)",
  maxWidth = 650,
  message = "You must be logged in or create an account before you can select a display name and join this pool."
}) {
  return (
    <section className="pool-login-prompt" style={{ "--pool-prompt-max-width": `${maxWidth}px` }}>
      <h4>🔒 Account Required to Join Pool</h4>
      <p className="text-subtitle">{message}</p>
      <div className="pool-login-actions">
        <Link to="/login">
          <button type="button" className="pool-login-button" style={{ "--pool-accent": accentColor }}>
            Log In
          </button>
        </Link>
        <Link to="/signup">
          <button type="button" className="pool-signup-button" style={{ "--pool-accent": accentColor }}>
            Create Account
          </button>
        </Link>
      </div>
    </section>
  );
}
