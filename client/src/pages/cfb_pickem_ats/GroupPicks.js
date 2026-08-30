import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const CFB_BLUE = "#013369";
const GOLD = "#c89d3c";
const CFB_RED = "#D50A0A";

export default function CfbPickemAtsMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matrixData, setMatrixData] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) return;
        axios.get("/api/cfb_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || "#0f172a",
                        secondaryColor: t.secondary_color || t.alt_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load CFB team colors", err));
    }, [token]);

    useEffect(() => {
        if (!user) return;
        
        const fetchMatrix = (isInitial = false) => {
            if (isInitial) setLoading(true);
            axios.get("/api/cfb_pickem_ats/matrix", {
                params: { week: currentWeek },
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setMatrixData(res.data || []);
                })
                .catch(err => {
                    console.error("Failed to load pick'em matrix", err);
                    if (isInitial) setMatrixData([]);
                })
                .finally(() => {
                    if (isInitial) setLoading(false);
                });
        };

        fetchMatrix(true);
        const interval = setInterval(() => fetchMatrix(false), 15000);
        return () => clearInterval(interval);
    }, [user, currentWeek, token]);

    const canRevealPick = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

    const { gamesList, sortedPlayers } = React.useMemo(() => {
        const gamesMap = new Map();
        const playersMap = {};

        matrixData.forEach(row => {
            const gameId = row.game_id;
            const rawMp = row.must_pick;
            const isMustPick = rawMp === true || rawMp === 1 || rawMp === "1" || rawMp === "true";

            if (!gamesMap.has(gameId)) {
                gamesMap.set(gameId, {
                    game_id: gameId,
                    away_team: row.away_team,
                    away_team_nickname: row.away_team_nickname,
                    home_team: row.home_team,
                    home_team_nickname: row.home_team_nickname,
                    away_logo: row.away_logo || teamColors[row.away_team]?.logo,
                    home_logo: row.home_logo || teamColors[row.home_logo]?.logo,
                    home_color: row.home_color,
                    home_secondary_color: row.home_secondary_color,
                    away_color: row.away_color,
                    away_secondary_color: row.away_secondary_color,
                    game_date: row.game_date,
                    adjusted_spread: row.adjusted_spread,
                    favorite: row.favorite,
                    winner: row.winner,
                    ats_winner: row.ats_winner,
                    must_pick: isMustPick,
                    home_score: row.home_score,
                    away_score: row.away_score,
                    status: row.status
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

            const atsWinner = row.ats_winner;
            const atsPick = row.ats_pick || row.picked_team;
            let status = (row.pick_status || row.status || row.result || "").toLowerCase();

            if (atsWinner && atsPick) {
                if (atsWinner === "PUSH") {
                    status = "push";
                } else if (atsWinner === atsPick) {
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

        playersArr.sort((a, b) => b.totalPoints - a.totalPoints || a.user_name.localeCompare(b.user_name));

        return {
            gamesList: gamesArr,
            sortedPlayers: playersArr
        };
    }, [matrixData, teamColors]);

    const getCellStyle = (game, pickObj) => {
        if (!pickObj || !pickObj.ats_pick) return { backgroundColor: "transparent" };
        
        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED";
        
        if (!isFinal && !game.ats_winner) return { backgroundColor: "transparent" };

        const st = pickObj.status;
        if (st === "win" || st === "correct" || (game.ats_winner && game.ats_winner === pickObj.ats_pick)) {
            return { backgroundColor: "#dcfce7", color: "#166534" }; // Soft Green
        } else if (st === "push" || st === "tie" || game.ats_winner === "PUSH") {
            return { backgroundColor: "#fef3c2", color: "#b45309" }; // Soft Yellow
        } else if (game.ats_winner && game.ats_winner !== pickObj.ats_pick) {
            return { backgroundColor: "#fee2e2", color: "#991b1b" }; // Soft Red
        }
        
        return { backgroundColor: "transparent" };
    };

    const GameHeader = ({ game }) => {
        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED";
        const isLive = rawStatus === "STATUS_IN_PROGRESS" || rawStatus === "IN_PROGRESS" || rawStatus === "HALFTIME" || rawStatus === "STATUS_HALFTIME" || rawStatus === "LIVE";
        const hasScores = game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined;

        const coveredTeam = game.ats_winner;
        const coveredLogo = coveredTeam === game.away_team ? game.away_logo : (coveredTeam === game.home_team ? game.home_logo : null);
        const isFavCovered = coveredTeam === game.favorite;
        const spreadLabel = game.adjusted_spread !== null && game.adjusted_spread !== undefined ? game.adjusted_spread : "";

        const awaySecondary = game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1";
        const homeSecondary = game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1";
        const coveredSecondary = coveredTeam === game.away_team ? awaySecondary : (coveredTeam === game.home_team ? homeSecondary : "#cbd5e1");

        return (
            <div style={{ textAlign: "center", width: "100%", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, padding: "2px 2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ background: awaySecondary, borderRadius: 3, padding: "1px 3px", display: "inline-flex", alignItems: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)" }}>
                            {game.away_logo && <img src={game.away_logo} alt="" height={14} style={{ flexShrink: 0, objectFit: "contain" }} />}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
                            {hasScores ? game.away_score : "-"}
                        </span>
                    </div>
                    <span style={{ fontSize: 9, color: "#cbd5e1" }}>@</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
                            {hasScores ? game.home_score : "-"}
                        </span>
                        <span style={{ background: homeSecondary, borderRadius: 3, padding: "1px 3px", display: "inline-flex", alignItems: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)" }}>
                            {game.home_logo && <img src={game.home_logo} alt="" height={14} style={{ flexShrink: 0, objectFit: "contain" }} />}
                        </span>
                    </div>
                </div>

                <div style={{ fontSize: 8, fontWeight: 700, margin: "2px 0" }}>
                    {isFinal ? (
                        <span style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 4px", borderRadius: 3 }}>FINAL</span>
                    ) : isLive ? (
                        <span style={{ backgroundColor: CFB_RED, color: "white", padding: "1px 4px", borderRadius: 3 }}>LIVE</span>
                    ) : (
                        <span style={{ color: "#cbd5e1" }}>
                            {game.game_date ? new Date(game.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD"}
                        </span>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, height: 16 }}>
                    {isFinal && coveredLogo && coveredTeam !== "PUSH" ? (
                        <>
                            <span style={{ background: coveredSecondary, borderRadius: 2, padding: "1px 2px", display: "inline-flex", alignItems: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.1)", border: "1px solid rgba(0,0,0,0.08)" }}>
                                <img src={coveredLogo} alt="" height={11} style={{ flexShrink: 0, objectFit: "contain" }} />
                            </span>
                            <span style={{ fontSize: 8, color: isFavCovered ? "#86efac" : "#fca5a5", fontWeight: 700 }}>
                                {spreadLabel ? (spreadLabel < 0 ? spreadLabel : `-${spreadLabel}`) : ""}
                            </span>
                        </>
                    ) : (
                        <span style={{ fontSize: 8, color: GOLD, fontWeight: 600 }}>
                            {spreadLabel ? (spreadLabel < 0 ? spreadLabel : `-${spreadLabel}`) : "Pick'em"}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats" className='page-content'>
            <div style={{ maxWidth: "100%", margin: "0 auto", padding: "16px 8px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <h2 style={{ color: CFB_BLUE, fontSize: "24px", margin: 0 }}>🏈 Weekly Group Matrix & Live Scores</h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "13px" }}>Picks are hidden until individual game kickoff. Scores update live.</p>
                </div>

                <div style={{ textAlign: "center", marginBottom: 1 }}>
                    <h3 style={{ color: "#0f172a", fontSize: "14px", margin: 0 }}>Select Week:</h3>
                </div>

                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginBottom: 16,
                    marginTop: 4
                }}>
                    <div style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 4,
                        maxWidth: "100%"
                    }}>
                        {[...Array(18)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentWeek(i + 1)}
                                style={{
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: currentWeek === i + 1 ? CFB_BLUE : "white",
                                    color: currentWeek === i + 1 ? "white" : "#0f172a",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    fontSize: "13px",
                                    transition: "all 0.2s"
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{
                    background: "white",
                    borderRadius: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #e2e8f0",
                    maxWidth: "100%",
                    overflowX: "auto",
                    position: "relative"
                }}>
                    {loading ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} matrix...</div>
                    ) : gamesList.length === 0 || sortedPlayers.length === 0 ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>No entries or games found for Week {currentWeek}.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                            <thead>
                                <tr style={{ backgroundColor: CFB_BLUE, color: "white" }}>
                                    <th style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: CFB_BLUE,
                                        padding: "10px 14px",
                                        textAlign: "left",
                                        fontSize: 13,
                                        minWidth: "150px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
                                    }}>
                                        Player (Pts)
                                    </th>
                                    {gamesList.map((game) => (
                                        <th key={game.game_id} style={{
                                            padding: "6px 8px",
                                            textAlign: "center",
                                            fontSize: "11px",
                                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                                            minWidth: "115px",
                                            backgroundColor: game.must_pick ? "#b45309" : CFB_BLUE
                                        }}>
                                            <GameHeader game={game} />
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
                                                padding: "10px 14px",
                                                fontWeight: isCurrentUser ? 800 : 600,
                                                fontSize: 13,
                                                color: "#0f172a",
                                                boxShadow: "2px 0 5px rgba(0,0,0,0.05)"
                                            }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span>
                                                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`} {player.user_name} {isCurrentUser && "(You)"}
                                                    </span>
                                                    <span style={{ fontWeight: 800, color: CFB_BLUE, marginLeft: 10 }}>
                                                        {player.totalPoints} pts
                                                    </span>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pickObj = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game.game_date);
                                                const showPick = isRevealed || isCurrentUser;

                                                const pickedTeam = pickObj?.ats_pick;
                                                const pickedMeta = teamColors[pickedTeam] || {};
                                                const pickedLogo = pickedTeam === game.away_team ? game.away_logo : (pickedTeam === game.home_team ? game.home_logo : pickedMeta.logo);
                                                const pickedSecondary = pickedTeam === game.away_team ? (game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1") : (pickedTeam === game.home_team ? (game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1") : (pickedMeta.secondaryColor || "#cbd5e1"));

                                                const cellStyle = getCellStyle(game, pickObj);

                                                return (
                                                    <td key={game.game_id} style={{
                                                        padding: "8px 10px",
                                                        textAlign: "center",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        borderLeft: "1px solid #e2e8f0",
                                                        borderBottom: "1px solid #f3f4f6",
                                                        ...cellStyle
                                                    }}>
                                                        {showPick ? (
                                                            pickedTeam ? (
                                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                                        <span style={{
                                                                            background: pickedSecondary,
                                                                            borderRadius: 3,
                                                                            padding: "1px 3px",
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                                            border: "1px solid rgba(0,0,0,0.08)"
                                                                        }}>
                                                                            {pickedLogo ? (
                                                                                <img src={pickedLogo} alt={pickedTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                                            ) : (
                                                                                <span style={{ fontSize: 10 }}>{pickedTeam}</span>
                                                                            )}
                                                                        </span>
                                                                        {pickObj.is_best_bet && (
                                                                            <span style={{ fontSize: "8px", background: GOLD, color: "white", padding: "1px 2px", borderRadius: 2, fontWeight: 900, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                                                                                ★
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "11px" }}>-</span>
                                                            )
                                                        ) : (
                                                            <span style={{ color: "#d97706", fontWeight: 600, fontSize: "11px" }}>🔒</span>
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