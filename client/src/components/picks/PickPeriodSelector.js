import React from "react";

export default function PickPeriodSelector({
  periods,
  value,
  onChange,
  accentColor = "var(--primary-navy)",
  label = "Select period"
}) {
  return (
    <nav className="pick-period-selector" aria-label={label}>
      {periods.map(({ value: periodValue, label: periodLabel }) => (
        <button
          key={periodValue}
          type="button"
          aria-current={value === periodValue ? "page" : undefined}
          onClick={() => onChange(periodValue)}
          style={{ "--pick-period-accent": accentColor }}
        >
          {periodLabel}
        </button>
      ))}
    </nav>
  );
}
