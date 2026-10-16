import React from "react";

export default function ClearPicksButton({ onClick, visible = true }) {
  if (!visible) return null;

  return (
    <button type="button" className="clear-picks-button" onClick={onClick}>
      Clear Picks
    </button>
  );
}
