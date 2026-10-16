import React from "react";

export default function PickSortSelect({ value, onChange, options, label = "Sort:" }) {
  return (
    <label className="pick-sort-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(({ value: optionValue, label: optionLabel }) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}
