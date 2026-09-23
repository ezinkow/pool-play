import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useCFBTeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";

const BOWL_BLUE = "#0369a1";
const GOLD = "#c89d3c";
const BOWL_RED = "#D50A0A";

// ✨ Condensation-optimized pulsing live indicator
const PULSE_STYLE = {
    width: "6px",
    height: "6px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
    animation: "pulse 2s infinite"
};

export default function CfbBowlConfidenceMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [matrixData, setMatrixData] = useState([]);
    const [standingsData, setStandingsData] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading } = useTeamColors(token);

    // Fetch bowl matrix group data and standings data
    useEffect(() => {
        if (!user || !token) return;

        const fetchData = (isInitial = false) => {
            if (isInitial) setLoading(true);

            Promise.all([
                axios.get("/api/cfb_bowl_pickem/matrix", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/cfb_bowl_pickem/standings", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ])
                .then(([matrixRes, standingsRes]) => {
                    setMatrixData(matrixRes.data || []);
                    setStandingsData(standingsRes.data || []);
                })
                .catch(err => {
                    console.error("Failed to load bowl matrix or standings", err);
                    if (isInitial) {
                        setMatrixData([]);
                        setStandingsData([]);
                    }
                })
                .finally(() => {
                    if (isInitial) setLoading(false);
                });
        };

        fetchData(true);
        const interval = setInterval(() => fetchData(false), 15000);
        return () => clearInterval(interval);
    }, [user, token]);

    // ✨ Reveal check logic for individual cells (reveals if game is live/final or past kickoff, plus user's own picks)
    const canRevealPick = (game) => {
        if (!game || !game.game_date) return false;
        const rawStatus = (game.status || "").toUpperCase();
        const isLive = rawStatus.includes("HALF") || rawStatus.includes("PROGRESS") || rawStatus.includes("LIVE") || rawStatus.includes("IN_PROGRESS");
        const isFinal = rawStatus.includes("FINAL") || rawStatus.includes("COMPLETED");
        return isLive || isFinal || new Date() >= new Date(game.game_date);
    };

    const { gamesList, sortedPlayers } = React.useMemo(() => {
        const gamesMap = new Map();
        const playersMap = {};

        // Build a lookup map for standings points by user_id
        const standingsMap = new Map();
        standingsData.forEach(s => {
            standingsMap.set(Number(s.user_id), Number(s.total_points) || 0);
        });

        matrixData.forEach(row => {
            const gameId = row.game_id;

            if (!gamesMap.has(gameId)) {
                gamesMap.set(gameId, {
                    game_id: gameId,
                    bowl_game: row.bowl_game,
                    bowl_logo: row.bowl_logo || null,
                    away_team: row.away_team,
                    away_team_nickname: row.away_team_nickname,
                    home_team: row.home_team,
                    home_team_nickname: row.home_team_nickname,
                    away_logo: teamColors[row.away_team]?.logo || row.away_logo || null,
                    home_logo: teamColors[row.home_team]?.logo || row.home_logo || null,
                    home_color: row.home_color,
                    home_secondary_color: row.home_secondary_color,
                    away_color: row.away_color,
                    away_secondary_color: row.away_secondary_color,
                    game_date: row.game_date,
                    winner: row.winner,
                    home_score: row.home_score,
                    away_score: row.away_score,
                    status: row.status,
                    live_status: row.live_status
                });
            }

            if (!playersMap[row.user_id]) {
                const seasonPoints = standingsMap.get(Number(row.user_id)) || 0;
                playersMap[row.user_id] = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    picks: {},
                    totalPoints: seasonPoints,
                    bowlPointsEarned: 0
                };
            }

            const pickedTeam = row.picked_team;
            const confidencePoints = Number(row.confidence_points) || 0;
            let status = (row.pick_status || row.status || "").toLowerCase();

            const winner = row.winner;
            if (winner && pickedTeam) {
                if (winner === "PUSH") {
                    status = "push";
                } else if (winner === pickedTeam) {
                    status = "win";
                } else {
                    status = "loss";
                }
            }

            playersMap[row.user_id].picks[gameId] = {
                picked_team: pickedTeam,
                confidence_points: confidencePoints,
                status: status
            };

            if (status === "win") {
                playersMap[row.user_id].bowlPointsEarned += confidencePoints;
            }
        });

        // ✨ Filter games to ONLY include live or completed games, then sort newest first (descending)
        const gamesArr = Array.from(gamesMap.values())
            .filter(game => {
                const rawStatus = (game.status || "").toUpperCase();
                const isLive = rawStatus.includes("HALF") || rawStatus.includes("PROGRESS") || rawStatus.includes("LIVE") || rawStatus.includes("IN_PROGRESS");
                const isFinal = rawStatus.includes("FINAL") || rawStatus.includes("COMPLETED") || (game.live_status && game.live_status.toLowerCase() === "final");
                return isLive || isFinal;
            })
            .sort((a, b) => {
                const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
                const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;
                return dateB - dateA; // Newest first
            });

        const playersArr = Object.values(playersMap);

        // Sort players strictly by points earned (descending)
        playersArr.sort((a, b) => {
            return b.bowlPointsEarned - a.bowlPointsEarned || b.totalPoints - a.totalPoints || a.user_name.localeCompare(b.user_name);
        });

        return {
            gamesList: gamesArr,
            sortedPlayers: playersArr
        };
    }, [matrixData, standingsData, teamColors]);

    const getCellStyle = (game, pickObj) => {
        if (!pickObj || !pickObj.picked_team) return { backgroundColor: "transparent" };

        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED";

        if (!isFinal && !game.winner) return { backgroundColor: "transparent" };

        const st = pickObj.status;
        const winner = game.winner;
        if (st === "win" || st === "correct" || (winner && winner === pickObj.picked_team)) {
            return { backgroundColor: "#dcfce7", color: "#166534" }; // Soft Green
        } else if (st === "push" || st === "tie" || winner === "PUSH") {
            return { backgroundColor: "#fef3c2", color: "#b45309" }; // Soft Yellow
        } else if (winner && winner !== pickObj.picked_team) {
            return { backgroundColor: "#fee2e2", color: "#991b1b" }; // Soft Red
        }

        return { backgroundColor: "transparent" };
    };

    const GameHeader = ({ game }) => {
        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED" || (game.live_status && game.live_status.toLowerCase() === "final");
        const isLive = !isFinal && (rawStatus === "STATUS_IN_PROGRESS" || rawStatus === "IN_PROGRESS" || rawStatus === "HALFTIME" || rawStatus === "STATUS_HALFTIME" || rawStatus === "LIVE" || rawStatus.includes("HALF") || rawStatus.includes("PROGRESS") || (game.live_status && game.live_status !== "Final" && !game.live_status.includes("AM") && !game.live_status.includes("PM")));
        const hasScores = game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined;

        const awayTeamMeta = teamColors[game.away_team] || {};
        const homeTeamMeta = teamColors[game.home_team] || {};

        const awayPrimary = game.away_color || awayTeamMeta.primaryColor || "#000000";
        const awaySecondary = game.away_secondary_color || awayTeamMeta.secondaryColor || "#cbd5e1";

        const homePrimary = game.home_color || homeTeamMeta.primaryColor || "#000000";
        const homeSecondary = game.home_secondary_color || homeTeamMeta.secondaryColor || "#cbd5e1";

        const getBadgeStyle = (primaryColor, secondaryColor) => ({
            background: secondaryColor,
            borderRadius: 4,
            padding: "2px 4px",
            display: "inline-flex",
            alignItems: "center",
            boxShadow: `0 0 4px 1px ${primaryColor}, 0 1px 2px rgba(0,0,0,0.2)`,
            border: `2px solid ${primaryColor}`,
            margin: "2px"
        });

        const awayBadgeStyle = getBadgeStyle(awayPrimary, awaySecondary);
        const homeBadgeStyle = getBadgeStyle(homePrimary, homeSecondary);
        const liveStatusText = game.live_status || "LIVE";

        return (
            <div style={{ textAlign: "center", width: "100%", overflow: "visible" }}>
                <div style={{ fontSize: "10px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                    {game.bowl_game}
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "2px 2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={awayBadgeStyle}>
                            {game.away_logo && <img src={game.away_logo} alt="" height={14} style={{ flexShrink: 0, objectFit: "contain" }} />}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
                            {hasScores ? game.away_score : "-"}
                        </span>
                    </div>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>@</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: hasScores ? "#fef08a" : "#ffffff" }}>
                            {hasScores ? game.home_score : "-"}
                        </span>
                        <span style={homeBadgeStyle}>
                            {game.home_logo && <img src={game.home_logo} alt="" height={14} style={{ flexShrink: 0, objectFit: "contain" }} />}
                        </span>
                    </div>
                </div>

                <div style={{ fontSize: 9, fontWeight: 700, margin: "2px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    {isFinal ? (
                        <span style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 6px", borderRadius: 3 }}>FINAL</span>
                    ) : isLive ? (
                        <>
                            <span style={PULSE_STYLE} />
                            <span style={{ backgroundColor: BOWL_RED, color: "white", padding: "1px 6px", borderRadius: 3 }}>{liveStatusText}</span>
                        </>
                    ) : (
                        <span style={{ color: "#cbd5e1" }}>
                            {game.game_date ? new Date(game.game_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "TBD"}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    if (authLoading || colorsLoading) return <div style={{ textAlign: "center", padding: 50 }}>Loading bowl matrix...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_bowl_pickem" className='page-content'>
            <div style={{ width: "100%", margin: "0 auto", padding: "12px 4px", paddingBottom: 80 }}>
                <style>{`
                    @keyframes pulse { 
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
                        70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
                    }
                    .matrix-container::-webkit-scrollbar { height: 5px; }
                    .matrix-container::-webkit-scrollbar-track { background: #f1f5f9; }
                    .matrix-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                `}</style>

                <div style={{ textAlign: "center", marginBottom: 16, padding: "0 8px" }}>
                    <h2 style={{ color: BOWL_BLUE, fontSize: "20px", margin: 0 }}>🏆 Bowl Confidence Group Matrix</h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>Showing live & completed games (newest first).</p>
                </div>

                <div className="matrix-container" style={{
                    background: "white",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #e2e8f0",
                    maxWidth: "100%",
                    overflowX: "auto",
                    position: "relative"
                }}>
                    {loading ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>Loading bowl matrix data...</div>
                    ) : gamesList.length === 0 || sortedPlayers.length === 0 ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>No live or completed bowl games found.</div>
                    ) : (
                        <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap", tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ backgroundColor: BOWL_BLUE, color: "white" }}>
                                    <th style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: BOWL_BLUE,
                                        padding: "10px 12px",
                                        textAlign: "left",
                                        fontSize: 12,
                                        width: "185px",
                                        minWidth: "185px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                                        verticalAlign: "middle"
                                    }}>
                                        Participant (Pts / Ovr)
                                    </th>
                                    {gamesList.map((game) => (
                                        <th key={game.game_id} style={{
                                            padding: "8px 6px",
                                            textAlign: "center",
                                            fontSize: "11px",
                                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                                            width: "130px",
                                            minWidth: "130px",
                                            backgroundColor: BOWL_BLUE,
                                            overflow: "visible"
                                        }}>
                                            <GameHeader game={game} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, idx) => {
                                    const rank = sortedPlayers.filter(p => p.totalPoints > player.totalPoints).length + 1;
                                    const isCurrentUser = Number(player.user_id) === Number(user.id);

                                    return (
                                        <tr key={player.user_id} style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td
                                                style={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 5,
                                                    backgroundColor: isCurrentUser ? "#dbeafe" : (idx % 2 === 0 ? "#fafafa" : "white"),
                                                    padding: "8px 12px",
                                                    width: "185px",
                                                    minWidth: "185px",
                                                    maxWidth: "185px",
                                                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                                                    verticalAlign: "middle"
                                                }}
                                            >
                                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                                    <div style={{
                                                        fontWeight: isCurrentUser ? 800 : 700,
                                                        fontSize: 12,
                                                        color: "#0f172a",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}>
                                                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} {player.user_name} {isCurrentUser && "(You)"}
                                                    </div>
                                                    <div style={{
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        color: BOWL_BLUE,
                                                        letterSpacing: "-0.2px"
                                                    }}>
                                                        Pts: {player.bowlPointsEarned} | Ovr: {player.totalPoints}
                                                    </div>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pickObj = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game);
                                                const showPick = isRevealed || isCurrentUser;

                                                const pickedTeam = pickObj?.picked_team;
                                                const confidencePts = pickObj?.confidence_points || "-";
                                                const pickedMeta = teamColors[pickedTeam] || {};
                                                const pickedPrimary = pickedTeam === game.away_team ? (game.away_color || teamColors[game.away_team]?.primaryColor || "#000000") : (pickedTeam === game.home_team ? (game.home_color || teamColors[game.home_team]?.primaryColor || "#000000") : (pickedMeta.primaryColor || "#000000"));
                                                const pickedLogo = pickedTeam === game.away_team ? game.away_logo : (pickedTeam === game.home_team ? game.home_logo : pickedMeta.logo);
                                                const pickedSecondary = pickedTeam === game.away_team ? (game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1") : (pickedTeam === game.home_team ? (game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1") : (pickedMeta.secondaryColor || "#cbd5e1"));

                                                const cellStyle = getCellStyle(game, pickObj);

                                                return (
                                                    <td key={game.game_id} style={{
                                                        padding: "8px 6px",
                                                        textAlign: "center",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        borderLeft: "1px solid #e2e8f0",
                                                        borderBottom: "1px solid #f3f4f6",
                                                        width: "130px",
                                                        minWidth: "130px",
                                                        overflow: "visible",
                                                        ...cellStyle
                                                    }}>
                                                        {showPick ? (
                                                            pickedTeam ? (
                                                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, width: "100%" }}>
                                                                    <span style={{
                                                                        backgroundColor: "#f1f5f9",
                                                                        color: BOWL_BLUE,
                                                                        border: "1px solid #cbd5e1",
                                                                        borderRadius: 4,
                                                                        padding: "1px 5px",
                                                                        fontSize: "11px",
                                                                        fontWeight: 900
                                                                    }}>
                                                                        {confidencePts}
                                                                    </span>

                                                                    <span style={{
                                                                        background: pickedSecondary,
                                                                        borderRadius: 4,
                                                                        padding: "2px 4px",
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        boxShadow: `0 0 4px 1px ${pickedPrimary}, 0 1px 2px rgba(0,0,0,0.15)`,
                                                                        border: `2px solid ${pickedPrimary}`
                                                                    }}>
                                                                        {pickedLogo ? (
                                                                            <img src={pickedLogo} alt={pickedTeam} style={{ width: 18, height: 18, objectFit: "contain", display: "block" }} />
                                                                        ) : (
                                                                            <span style={{ fontSize: 10 }}>{pickedTeam}</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "11px" }}>-</span>
                                                            )
                                                        ) : (
                                                            <span style={{ color: "#d97706", fontWeight: 600, fontSize: "12px" }}>🔒</span>
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