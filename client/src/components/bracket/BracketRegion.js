import React from "react";
import BracketGame from "./BracketGame";

const ROUNDS = [
    { round: 1, label: "1st Round", count: 8 },
    { round: 2, label: "2nd Round", count: 4 },
    { round: 3, label: "Sweet 16", count: 2 },
    { round: 4, label: "Elite 8", count: 1 },
];

export default function BracketRegion({
    region, games, userPicks, onPick, readonly, flipped, getDisplayGame
}) {
    // Group games by round
    const byRound = {};
    for (const g of games) {
        if (!byRound[g.round]) byRound[g.round] = [];
        byRound[g.round].push(g);
    }

    // Sort each round by bracket_slot
    for (const r of Object.keys(byRound)) {
        byRound[r].sort((a, b) => a.bracket_slot - b.bracket_slot);
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Region label */}
            <div style={{
                textAlign: "center",
                fontWeight: 800,
                fontSize: 13,
                color: "#13447a",
                textTransform: "uppercase",
                letterSpacing: "1px",
                marginBottom: 8,
                borderBottom: "2px solid #c89d3c",
                paddingBottom: 4,
            }}>
                {region}
            </div>

            <div style={{ display: "flex", flexDirection: flipped ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
                {ROUNDS.map(({ round, label }) => {
                    const roundGames = byRound[round] || [];
                    const gamesInRound = ROUNDS.find(r => r.round === round)?.count || 1;
                    // Calculate spacing to vertically center games
                    const totalSlots = 8; // always 8 first-round slots
                    const slotsPerGame = totalSlots / gamesInRound;

                    return (
                        <div key={round} style={{ display: "flex", flexDirection: "column" }}>
                            {/* Round label */}
                            <div style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#9ca3af",
                                textAlign: "center",
                                marginBottom: 6,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}>
                                {label}
                            </div>

                            {/* Games */}
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0,
                                justifyContent: "space-around",
                                flex: 1,
                            }}>
                                {Array.from({ length: gamesInRound }).map((_, idx) => {
                                    const game = roundGames[idx];
                                    const spacer = (slotsPerGame - 1) * 8; // rough vertical spacer

                                    return (
                                        <div key={idx} style={{
                                            marginBottom: idx < gamesInRound - 1 ? spacer : 0,
                                        }}>
                                            {game ? (
                                                <BracketGame
                                                    game={getDisplayGame ? getDisplayGame(game) : game}
                                                    userPick={userPicks?.[game.id]}
                                                    onPick={onPick}
                                                    readonly={readonly}
                                                    isFinal={game.status === "STATUS_FINAL"}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: 180,
                                                    height: 64,
                                                    borderRadius: 8,
                                                    border: "1px dashed #e5e7eb",
                                                    backgroundColor: "#f9fafb",
                                                }} />
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