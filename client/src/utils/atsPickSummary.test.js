import { calculateAtsPickSummary } from "./atsPickSummary";

describe("calculateAtsPickSummary", () => {
  test("counts only resolved picks and awards a double point for best bets", () => {
    const summary = calculateAtsPickSummary([
      { id: 1, ats_winner: "Away" },
      { id: 2, ats_winner: "PUSH" },
      { id: 3, ats_winner: "Home" },
      { id: 4, ats_winner: null },
      { id: 5, ats_winner: "Away" }
    ], {
      1: { picked_team: "Away", is_best_bet: true },
      2: { picked_team: "Home" },
      3: { picked_team: "Away" },
      4: { picked_team: "Away" },
      5: { is_best_bet: true }
    });

    expect(summary).toEqual({ wins: 1, losses: 1, pushes: 1, weekPoints: 2 });
  });

  test("returns zero stats when no picks have resolved", () => {
    expect(calculateAtsPickSummary([{ id: 1, ats_winner: null }])).toEqual({
      wins: 0,
      losses: 0,
      pushes: 0,
      weekPoints: 0
    });
  });
});
