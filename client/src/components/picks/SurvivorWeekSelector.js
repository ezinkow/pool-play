import React from "react";

export default function SurvivorWeekSelector({
  currentWeek,
  maxAvailableWeek,
  onWeekChange,
  totalWeeks = maxAvailableWeek,
  firstWeek = 1,
  accentColor = "var(--primary-navy)"
}) {
  const weeks = Array.from(
    { length: Math.max(0, totalWeeks - firstWeek + 1) },
    (_, index) => index + firstWeek
  );

  return (
    <nav className="survivor-week-selector" aria-label="Select week">
      {weeks.map((week) => {
        const isLocked = week > maxAvailableWeek;
        const isCurrent = currentWeek === week;

        return (
          <button
            key={week}
            type="button"
            aria-current={isCurrent ? "page" : undefined}
            aria-disabled={isLocked}
            disabled={isLocked}
            onClick={() => onWeekChange(week)}
            style={{ "--survivor-accent": accentColor }}
          >
            Week {week}
          </button>
        );
      })}
    </nav>
  );
}
