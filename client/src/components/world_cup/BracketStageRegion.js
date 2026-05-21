import React from "react";
import BracketStage from "./BracketStage";

const GOLD = "#c89d3c";

const ROUNDS_CONFIG = [
    { round: 1, label: "Round of 32", count: 8 },
    { round: 2, label: "Round of 16", count: 4 },
    { round: 3, label: "Quarterfinals", count: 2 },
    { round: 4, label: "Semifinals", count: 1 }
];

export default function BracketRegion({
    sideLabel, games, userPicks, onPick, readonly, flipped, getDisplayGame
}) {
    const byRound = {};
    for (const g of games) {
        if (!byRound[g.round]) byRound[g.round] = [];
        byRound[g.round].push(g);
    }
    for (const r of Object.keys(byRound)) {
        byRound[r].sort((a, b) => a.bracket_slot - b.bracket_slot);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
                textAlign: "center", fontWeight: 800, fontSize: 13, color: "#13447a",
                textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8,
                borderBottom: `2px solid ${GOLD}`, paddingBottom: 4
            }}>
                {sideLabel}
            </div>

            <div style={{ display: "flex", flexDirection: flipped ? "row-reverse" : "row", gap: 12, alignItems: "center" }}>
                {ROUNDS_CONFIG.map(({ round, label, count }) => {
                    const roundGames = byRound[round] || [];
                    const slotsPerGame = 8 / count;

                    return (
                        <div key={round} style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textAlign: "center", marginBottom: 6, textTransform: "uppercase" }}>
                                {label}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", flex: 1 }}>
                                {Array.from({ length: count }).map((_, idx) => {
                                    const game = roundGames[idx];
                                    const spacer = (slotsPerGame - 1) * 32; // Calculated baseline vertical alignment gaps

                                    return (
                                        <div key={idx} style={{ marginBottom: idx < count - 1 ? spacer : 0, paddingTop: idx > 0 ? spacer / 4 : 0 }}>
                                            {game ? (
                                                <BracketStage
                                                    game={getDisplayGame(game)}
                                                    userPick={userPicks?.[game.match_id]}
                                                    onPick={onPick}
                                                    readonly={readonly}
                                                />
                                            ) : (
                                                <div style={{ width: 180, height: 48, borderRadius: 8, border: "1px dashed #e5e7eb", backgroundColor: "#f9fafb" }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}