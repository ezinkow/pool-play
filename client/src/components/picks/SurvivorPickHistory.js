import React from "react";

function getResult(game, pickedTeam) {
  if (!game?.winner) return { label: "⏳ Pending Game", className: "pending" };
  if (game.winner === "PUSH") return { label: "— PUSH (Survived)", className: "push" };
  if (game.winner === pickedTeam) return { label: "✓ WIN (Advanced)", className: "win" };
  return { label: "✕ LOSS (Eliminated)", className: "loss" };
}

function getScoreLabel(game) {
  if (
    game.status === "final"
    || (game.home_score > 0 || (game.away_score > 0 && game.status !== "scheduled" && game.status !== "pending"))
  ) {
    return `${game.status === "final" ? "Final" : "Live"}: ${game.away_score} - ${game.home_score}`;
  }
  if (
    game.home_score !== null
    && game.away_score !== null
    && (game.home_score > 0 || game.away_score > 0)
  ) {
    return `Score: ${game.away_score} - ${game.home_score}`;
  }
  return "Pending";
}

export default function SurvivorPickHistory({
  picks,
  teamColors,
  emptyMessage
}) {
  if (picks.length === 0) {
    return (
      <div className="survivor-history-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="survivor-history-list">
      {picks.map(({ week, pickedTeam, game }) => {
        const meta = teamColors[pickedTeam] || {};
        const result = getResult(game, pickedTeam);
        const primaryColor = meta.primaryColor || "var(--primary-navy)";

        return (
          <article
            key={week}
            className="survivor-history-card"
            style={{
              "--survivor-team-primary": primaryColor,
              "--survivor-team-secondary": meta.secondaryColor || "var(--border-color)"
            }}
          >
            <div className="survivor-history-team">
              <div>
                <span>Week {week} Selection</span>
                <h3>{pickedTeam}</h3>
              </div>
              {meta.logo && <img src={meta.logo} alt={`${pickedTeam} logo`} />}
            </div>

            {game && (
              <div className="survivor-history-matchup">
                <strong>{game.away_team} @ {game.home_team}</strong>
                <span>{getScoreLabel(game)}</span>
              </div>
            )}

            <div className="survivor-history-result">
              <span>Status:</span>
              <strong className={result.className}>{result.label}</strong>
            </div>
          </article>
        );
      })}
    </div>
  );
}
