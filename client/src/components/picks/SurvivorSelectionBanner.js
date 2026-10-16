import React from "react";

export default function SurvivorSelectionBanner({
  week,
  team,
  teamMeta = {},
  emptyMessage = `No selection made for Week ${week} yet.`,
  accentColor = "var(--primary-navy)",
  compact = false
}) {
  return (
    <div
      className={`survivor-selection-banner${team ? " has-selection" : ""}${compact ? " compact" : ""}`}
      style={{
        "--survivor-accent": teamMeta.primaryColor || accentColor,
        "--survivor-secondary": teamMeta.secondaryColor || "var(--border-color)"
      }}
      role="status"
    >
      {team ? (
        <>
          {teamMeta.logo && <img src={teamMeta.logo} alt="" />}
          <span>✓ Week {week} Selection: {team}</span>
        </>
      ) : (
        `⚠️ ${emptyMessage}`
      )}
    </div>
  );
}
