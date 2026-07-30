import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const GOLD = "#c89d3c";

export default function NflPickemAtsMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matrixData, setMatrixData] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch matrix data for the selected week
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        axios.get("/api/nfl_pickem_ats/matrix", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setMatrixData(res.data || []);
            })
            .catch(err => {
                console.error("Failed to load pick'em matrix", err);
                setMatrixData([]);
            })
            .finally(() => setLoading(false));
    }, [user, currentWeek, token]);

    const canRevealPick = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

    // Pivot flat rows into: { games: [...unique games], players: [ ...sorted list of player objects with calculated points ] }
    const { gamesList, sortedPlayers } = React.useMemo(() => {
        const gamesMap = new Map();
        const playersMap = {};

        matrixData.forEach(row => {
            const gameId = row.game_id;
            if (!gamesMap.has(gameId)) {
                gamesMap.set(gameId, {
                    game_id: gameId,
                    away_team: row.away_team,
                    home_team: row.home_team,
                    away_logo: row.away_logo,
                    home_logo: row.home_logo,
                    game_date: row.game_date,
                    adjusted_spread: row.adjusted_spread,
                    favorite: row.favorite,
                    winner: row.winner // Authoritative ATS winner from backend
                });
            }

            if (!playersMap[row.user_id]) {
                playersMap[row.user_id] = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    picks: {},
                    totalPoints: 0
                };
            }

            const rawBb = row.is_best_bet;
            const isBestBet = rawBb === true || rawBb === 1 || rawBb === "1" || rawBb === "true";

            let status = (row.status || row.result || "").toLowerCase();
            const winner = row.winner;
            const atsPick = row.ats_pick || row.picked_team;

            if (!status && winner !== null && winner !== undefined && winner !== "" && atsPick) {
                if (winner === "PUSH") {
                    status = "push";
                } else if (winner === atsPick) {
                    status = "win";
                } else {
                    status = "loss";
                }
            }

            playersMap[row.user_id].picks[gameId] = {
                ats_pick: atsPick,
                is_best_bet: isBestBet,
                status: status
            };
        });

        // Calculate total points for each player
        const gamesArr = Array.from(gamesMap.values());
        const playersArr = Object.values(playersMap).map(player => {
            let totalPoints = 0;
            gamesArr.forEach(game => {
                const pick = player.picks[game.game_id];
                if (pick && pick.status) {
                    const isWin = pick.status === "win" || pick.status === "correct";
                    if (isWin) {
                        totalPoints += pick.is_best_bet ? 2 : 1;
                    }
                }
            });
            return { ...player, totalPoints };
        });

        // Sort players by total points descending, then by user_name alphabetically
        playersArr.sort((a, b) => b.totalPoints - a.totalPoints || a.user_name.localeCompare(b.user_name));

        return {
            gamesList: gamesArr,
            sortedPlayers: playersArr
        };
    }, [matrixData]);

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_pickem_ats">
            <div style={{ maxWidth: "100%", margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Weekly Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Picks are hidden until individual game kickoff.</p>
                </div>

                <div style={{ textAlign: "center", marginBottom: 1 }}>
                    <h3 style={{ color: NFL_BLUE, fontSize: "15px", margin: 0 }}>Select Week:</h3>
                </div>

                {/* Week Selector Tabs */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginBottom: 20,
                    marginTop: 4
                }}>
                    <div style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 6,
                        maxWidth: "100%"
                    }}>
                        {[...Array(18)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentWeek(i + 1)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #ddd",
                                    backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                    color: currentWeek === i + 1 ? "white" : "#333",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    fontSize: "14px",
                                    transition: "all 0.2s"
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Matrix Table */}
                <div style={{
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    border: "1px solid #e2e8f0",
                    maxWidth: "100%",
                    overflowX: "auto",
                    position: "relative"
                }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} matrix...</div>
                    ) : gamesList.length === 0 || sortedPlayers.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>No entries or games found for Week {currentWeek}.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                            <thead>
                                <tr style={{ backgroundColor: NFL_BLUE, color: "white" }}>
                                    <th style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: NFL_BLUE,
                                        padding: "14px 16px",
                                        textAlign: "left",
                                        fontSize: 14,
                                        minWidth: "180px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
                                    }}>
                                        Player (Pts)
                                    </th>
                                    {gamesList.map((game) => (
                                        <th key={game.game_id} style={{
                                            padding: "12px 14px",
                                            textAlign: "center",
                                            fontSize: "12px",
                                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                                            minWidth: "130px"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                                                {game.away_logo && <img src={game.away_logo} alt={game.away_team} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                                <span>@</span>
                                                {game.home_logo && <img src={game.home_logo} alt={game.home_team} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: "11px", opacity: 0.9 }}>
                                                {game.away_team} vs {game.home_team}
                                            </div>
                                            <div style={{ fontSize: "10px", color: GOLD, marginTop: 2 }}>
                                                Line: {game.adjusted_spread}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, idx) => {
                                    const isCurrentUser = Number(player.user_id) === Number(user.id);

                                    return (
                                        <tr key={player.user_id} style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td style={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 5,
                                                backgroundColor: isCurrentUser ? "#dbeafe" : (idx % 2 === 0 ? "#fafafa" : "white"),
                                                padding: "12px 16px",
                                                fontWeight: isCurrentUser ? 800 : 600,
                                                fontSize: 14,
                                                color: "#0f172a",
                                                boxShadow: "2px 0 5px rgba(0,0,0,0.05)"
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span>{player.user_name} {isCurrentUser && "(You)"}</span>
                                                    <span style={{ fontWeight: 800, color: NFL_BLUE, marginLeft: 12 }}>
                                                        {player.totalPoints} pts
                                                    </span>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pick = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game.game_date);
                                                const showPick = isRevealed || isCurrentUser;

                                                let status = pick?.status || "";
                                                let pickBg = "transparent";
                                                let textColor = "#0f172a";
                                                if (status === "win" || status === "correct") {
                                                    pickBg = "#dcfce7";
                                                    textColor = "#166534";
                                                } else if (status === "loss" || status === "incorrect" || status === "lost") {
                                                    pickBg = "#fee2e2";
                                                    textColor = "#991b1b";
                                                } else if (status === "push" || status === "tie") {
                                                    pickBg = "#fef3c2";
                                                    textColor = "#b45309";
                                                }

                                                const isWin = status === "win" || status === "correct";
                                                let pointsDisplay = null;
                                                if (isWin) {
                                                    pointsDisplay = pick?.is_best_bet ? "+2" : "+1";
                                                }

                                                return (
                                                    <td key={game.game_id} style={{
                                                        padding: "10px 14px",
                                                        textAlign: "center",
                                                        fontSize: 13,
                                                        fontWeight: 700,
                                                        borderLeft: "1px solid #e2e8f0",
                                                        backgroundColor: pickBg,
                                                        color: textColor
                                                    }}>
                                                        {showPick ? (
                                                            pick?.ats_pick ? (
                                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                                        <span>{pick.ats_pick}</span>
                                                                        {pick.is_best_bet && (
                                                                            <span style={{ fontSize: "8px", background: GOLD, color: "white", padding: "1px 3px", borderRadius: 3, fontWeight: 900 }}>
                                                                                ★ BB
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {(pointsDisplay === "+1" || pointsDisplay === "+2") && (
                                                                        <span style={{ fontSize: "11px", fontWeight: 800, opacity: 0.85 }}>
                                                                            ({pointsDisplay})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: "#94a3b8", fontWeight: 400 }}>No Pick</span>
                                                            )
                                                        ) : (
                                                            <span style={{ color: "#d97706", fontWeight: 600 }}>🔒 Hidden</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </PoolGatekeeper>
    );
}