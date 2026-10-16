import React from "react";

export default function AtsPicksSummary({ week, wins, losses, pushes, weekPoints, overallPoints, accentColor }) {
  return (
    <header className="picks-summary-header" style={{ "--picks-summary-accent": accentColor }}>
      <h2>My Week {week} Summary</h2>
      <p>Review your ATS selections and Best Bet outcomes.</p>
      <div className="picks-summary-stats">
        <div className="picks-summary-stat">
          <span>Record</span>
          <strong>{wins} - {losses}{pushes > 0 ? ` - ${pushes}` : ""}</strong>
        </div>
        <div className="picks-summary-stat points">
          <span>Week Points</span>
          <strong>{weekPoints} pts</strong>
        </div>
        <div className="picks-summary-stat overall">
          <span>Overall Points</span>
          <strong>{overallPoints} pts</strong>
        </div>
      </div>
    </header>
  );
}
