export function calculateAtsPickSummary(games, picks = {}) {
  return games.reduce((summary, game) => {
    const userPick = picks[game.id];
    if (!userPick?.picked_team || game.ats_winner === null || game.ats_winner === undefined) {
      return summary;
    }

    if (game.ats_winner === "PUSH") {
      summary.pushes += 1;
    } else if (game.ats_winner === userPick.picked_team) {
      summary.wins += 1;
      summary.weekPoints += userPick.is_best_bet ? 2 : 1;
    } else {
      summary.losses += 1;
    }

    return summary;
  }, { wins: 0, losses: 0, pushes: 0, weekPoints: 0 });
}
