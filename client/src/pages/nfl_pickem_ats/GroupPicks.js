import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";
import AtsGroupGameHeader from "../../components/picks/AtsGroupGameHeader";
import PoolEmoji from "../../components/PoolEmoji";

const NFL_BLUE = "#101b2a";
const GOLD = "#c89d3c";
const NFL_RED = "#D50A0A";

export default function NflPickemAtsMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(null);
    const [matrixData, setMatrixData] = useState([]);
    const [matchupsData, setMatchupsData] = useState([]);
    const [standingsData, setStandingsData] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState("overall"); // "overall" or "week"

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (!token) return;
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || "#0f172a",
                        secondaryColor: t.secondaryColor || t.bg_color || t.alt_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    useEffect(() => {
        if (!token) return;

        axios.get("/api/nfl_regular_season/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data) {
                    const activeWk = res.data.current_week || res.data.active_week || res.data.currentWeek;
                    if (activeWk) {
                        setCurrentWeek(Number(activeWk));
                    } else {
                        setCurrentWeek(1);
                    }
                } else {
                    setCurrentWeek(1);
                }
            })
            .catch(err => {
                console.error("Failed to load pool settings:", err);
                setCurrentWeek(1);
            });
    }, [token]);

    useEffect(() => {
        if (!user || currentWeek === null) return;

        const fetchData = (isInitial = false) => {
            if (isInitial) setLoading(true);

            Promise.all([
                axios.get("/api/nfl_pickem_ats/matrix", {
                    params: { week: currentWeek },
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/nfl_regular_season_games", {
                    params: { week: currentWeek },
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/nfl_pickem_ats/standings", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ])
                .then(([matrixRes, matchupsRes, standingsRes]) => {
                    setMatrixData(matrixRes.data || []);
                    setMatchupsData(matchupsRes.data || []);
                    setStandingsData(standingsRes.data || []);
                })
                .catch(err => {
                    console.error("Failed to load pick'em matrix, matchups, or standings", err);
                    if (isInitial) {
                        setMatrixData([]);
                        setMatchupsData([]);
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
    }, [user, currentWeek, token]);

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

        const standingsMap = new Map();
        standingsData.forEach(s => {
            standingsMap.set(Number(s.user_id), Number(s.total_points) || 0);
        });

        const matchupsMap = new Map();
        matchupsData.forEach(m => {
            const gameId = m.id || m.game_id;
            matchupsMap.set(gameId, m);
        });

        matrixData.forEach(row => {
            const gameId = row.game_id;
            const rawMp = row.must_pick;
            const isMustPick = rawMp === true || rawMp === 1 || rawMp === "1" || rawMp === "true";

            const liveMatchup = matchupsMap.get(gameId) || {};

            if (!gamesMap.has(gameId)) {
                gamesMap.set(gameId, {
                    game_id: gameId,
                    away_team: row.away_team,
                    away_team_nickname: row.away_team_nickname,
                    home_team: row.home_team,
                    home_team_nickname: row.home_team_nickname,
                    away_logo: teamColors[row.away_team]?.logo || row.away_logo || liveMatchup.away_logo || null,
                    home_logo: teamColors[row.home_team]?.logo || row.home_logo || liveMatchup.home_logo || null,
                    home_color: row.home_color || liveMatchup.home_color,
                    home_secondary_color: row.home_secondary_color || liveMatchup.home_secondary_color,
                    away_color: row.away_color || liveMatchup.away_color,
                    away_secondary_color: row.away_secondary_color || liveMatchup.away_secondary_color,
                    game_date: row.game_date || liveMatchup.game_date,
                    adjusted_spread: row.adjusted_spread !== undefined ? row.adjusted_spread : liveMatchup.adjusted_spread,
                    favorite: row.favorite || liveMatchup.favorite,
                    winner: row.winner || liveMatchup.winner,
                    ats_winner: row.ats_winner || liveMatchup.ats_winner,
                    must_pick: isMustPick,
                    home_score: liveMatchup.home_score !== undefined ? liveMatchup.home_score : row.home_score,
                    away_score: liveMatchup.away_score !== undefined ? liveMatchup.away_score : row.away_score,
                    status: liveMatchup.status || row.status,
                    quarter: liveMatchup.quarter || liveMatchup.period || row.quarter || row.period,
                    clock: liveMatchup.clock || row.clock,
                    live_status: liveMatchup.live_status || row.live_status
                });
            }

            if (!playersMap[row.user_id]) {
                const seasonPoints = standingsMap.get(Number(row.user_id)) || 0;
                playersMap[row.user_id] = {
                    user_id: row.user_id,
                    user_name: row.user_name,
                    picks: {},
                    totalPoints: seasonPoints,
                    weekPoints: 0
                };
            }

            const rawBb = row.is_best_bet;
            const isBestBet = rawBb === true || rawBb === 1 || rawBb === "1" || rawBb === "true";

            const gameRef = gamesMap.get(gameId);
            const atsWinner = row.ats_winner || row.winner || gameRef?.ats_winner || gameRef?.winner;
            const rawPick = row.ats_pick || row.picked_team;
            const atsPick = (rawPick && typeof rawPick === "string" && rawPick.trim() !== "") ? rawPick.trim() : null;
            let status = "unpicked";

            if (atsPick && atsWinner) {
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

            if (atsPick && (status === "win" || status === "correct")) {
                const pointsToAdd = isBestBet ? 2 : 1;
                playersMap[row.user_id].weekPoints += pointsToAdd;
            }
        });

        const gamesArr = Array.from(gamesMap.values())
            .filter(game => {
                const rawStatus = (game.status || "").toUpperCase();
                const isLive = rawStatus.includes("HALF") || rawStatus.includes("PROGRESS") || rawStatus.includes("LIVE") || rawStatus.includes("IN_PROGRESS") || (game.live_status && game.live_status !== "Final" && !game.live_status.includes("AM") && !game.live_status.includes("PM"));
                const isFinal = rawStatus.includes("FINAL") || rawStatus.includes("COMPLETED") || (game.live_status && game.live_status.toLowerCase() === "final");
                return isLive || isFinal;
            })
            .sort((a, b) => {
                const dateA = a.game_date ? new Date(a.game_date).getTime() : 0;
                const dateB = b.game_date ? new Date(b.game_date).getTime() : 0;
                return dateB - dateA;
            });

        const playersArr = Object.values(playersMap);

        playersArr.sort((a, b) => {
            if (sortBy === "week") {
                return b.weekPoints - a.weekPoints || b.totalPoints - a.totalPoints || a.user_name.localeCompare(b.user_name);
            } else {
                return b.totalPoints - a.totalPoints || b.weekPoints - a.weekPoints || a.user_name.localeCompare(b.user_name);
            }
        });

        return {
            gamesList: gamesArr,
            sortedPlayers: playersArr
        };
    }, [matrixData, matchupsData, standingsData, teamColors, sortBy]);

    const getCellStyle = (game, pickObj) => {
        if (!pickObj || !pickObj.ats_pick) return { backgroundColor: "transparent" };

        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED" || (game.live_status && game.live_status.toLowerCase() === "final");

        if (!isFinal && !game.ats_winner && !game.winner) return { backgroundColor: "transparent" };

        const st = pickObj.status;
        const atsWinner = game.ats_winner || game.winner;
        if (st === "win" || st === "correct" || (atsWinner && atsWinner === pickObj.ats_pick)) {
            return { backgroundColor: "var(--pick-correct-bg)", color: "var(--pick-correct-text)" };
        } else if (st === "push" || st === "tie" || atsWinner === "PUSH") {
            return { backgroundColor: "#fef3c2", color: "#b45309" };
        } else if (atsWinner && atsWinner !== pickObj.ats_pick) {
            return { backgroundColor: "var(--pick-incorrect-bg)", color: "var(--pick-incorrect-text)" };
        }

        return { backgroundColor: "transparent" };
    };

    if (authLoading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50 }}>Loading matrix...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_pickem_ats" >
            <div className="pickem-matrix-page" style={{ width: "100%", margin: "0 auto", padding: "12px 4px", paddingBottom: 80 }}>
                <style>{`
                    @keyframes pulse { 
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
                        70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
                    }
                    .matrix-container::-webkit-scrollbar { height: 12px; }
                    .matrix-container::-webkit-scrollbar-track { background: #f1f5f9; }
                    .matrix-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                `}</style>

                <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
                    <h2 className="pickem-matrix-title" style={{ color: NFL_BLUE, fontSize: "20px", margin: 0 }}><PoolEmoji gameKey="nfl_pickem_ats" /> Weekly Group Matrix</h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>Showing live & completed games (newest first).</p>
                </div>

                <div style={{ textAlign: "center", marginBottom: 2 }}>
                    <h3 style={{ color: "#0f172a", fontSize: "13px", margin: 0 }}>Select Week:</h3>
                </div>

                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginBottom: 14,
                    marginTop: 4
                }}>
                    <div style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 6,
                        maxWidth: "100%",
                        paddingLeft: 8,
                        paddingRight: 8
                    }}>
                        {[...Array(18)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentWeek(i + 1)}
                                className={`pickem-matrix-week-button${currentWeek === i + 1 ? " is-selected" : ""}`}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                    color: currentWeek === i + 1 ? "white" : "#0f172a",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    fontSize: "13px",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                    transition: "all 0.2s"
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="matrix-container pickem-matrix-container" style={{
                    background: "white",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    border: "1px solid #e2e8f0",
                    maxWidth: "100%",
                    overflowX: "auto",
                    position: "relative"
                }}>
                    {loading ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} matrix...</div>
                    ) : gamesList.length === 0 || sortedPlayers.length === 0 ? (
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>No live or completed games found for Week {currentWeek}.</div>
                    ) : (
                        <table className="ats-group-picks-matrix-table" style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap", tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ backgroundColor: NFL_BLUE, color: "white" }}>
                                    <th style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: NFL_BLUE,
                                        padding: "8px 12px",
                                        textAlign: "left",
                                        fontSize: 12,
                                        width: "175px",
                                        minWidth: "175px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
                                        verticalAlign: "middle"
                                    }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <span>Player (Wk / Ovr)</span>
                                            <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                                                <button
                                                    className={`pickem-matrix-sort-button ${sortBy === "overall" ? "is-selected" : ""}`}
                                                    onClick={() => setSortBy("overall")}
                                                    style={{
                                                        width: "52px",
                                                        padding: "1px 2px",
                                                        borderRadius: 3,
                                                        border: `1px solid ${GOLD}`,
                                                        backgroundColor: sortBy === "overall" ? NFL_BLUE : "white",
                                                        color: sortBy === "overall" ? GOLD : NFL_BLUE,
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                        fontSize: "10px",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                        transition: "all 0.2s",
                                                        textAlign: "center"
                                                    }}
                                                >
                                                    Ovr
                                                </button>
                                                <button
                                                    className={`pickem-matrix-sort-button ${sortBy === "week" ? "is-selected" : ""}`}
                                                    onClick={() => setSortBy("week")}
                                                    style={{
                                                        width: "52px",
                                                        padding: "1px 2px",
                                                        borderRadius: 3,
                                                        border: `1px solid ${GOLD}`,
                                                        backgroundColor: sortBy === "week" ? NFL_BLUE : "white",
                                                        color: sortBy === "week" ? GOLD : NFL_BLUE,
                                                        cursor: "pointer",
                                                        fontWeight: 800,
                                                        fontSize: "10px",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                        transition: "all 0.2s",
                                                        textAlign: "center"
                                                    }}
                                                >
                                                    Wk
                                                </button>
                                            </div>
                                        </div>
                                    </th>
                                    {gamesList.map((game) => (
                                        <th key={game.game_id} style={{
                                            padding: "8px 6px",
                                            textAlign: "center",
                                            fontSize: "11px",
                                            width: "120px",
                                            minWidth: "120px",
                                            backgroundColor: game.must_pick ? "#b45309" : NFL_BLUE,
                                            overflow: "visible"
                                        }}>
                                            <AtsGroupGameHeader game={game} teamColors={teamColors} liveColor={NFL_RED} teamColorField="color" />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, idx) => {
                                    const rank = sortedPlayers.filter(p => p.totalPoints > player.totalPoints).length + 1;
                                    const isCurrentUser = Number(player.user_id) === Number(user?.id);

                                    return (
                                        <tr key={player.user_id} className={`pickem-matrix-row${isCurrentUser ? " is-current-user" : ""}`} style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td
                                                className="pickem-matrix-player-cell"
                                                style={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 5,
                                                    backgroundColor: isCurrentUser ? "#dbeafe" : (idx % 2 === 0 ? "#fafafa" : "white"),
                                                    padding: "8px 12px",
                                                    width: "175px",
                                                    minWidth: "175px",
                                                    maxWidth: "175px",
                                                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)",
                                                    verticalAlign: "middle",
                                                    borderBottom: "1px solid #f1f5f9",
                                                }}
                                            >
                                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                                    <div className="pickem-matrix-player-name" style={{
                                                        fontWeight: isCurrentUser ? 800 : 700,
                                                        fontSize: 12,
                                                        color: "#0f172a",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} {player.user_name} {isCurrentUser && "(You)"}
                                                    </div>
                                                    <div className="pickem-matrix-player-points" style={{
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        color: GOLD,
                                                        letterSpacing: "-0.2px"
                                                    }}>
                                                        Wk: {player.weekPoints} | Ovr: {player.totalPoints}
                                                    </div>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pickObj = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game);
                                                const showPick = isRevealed || isCurrentUser;

                                                const pickedTeam = pickObj?.ats_pick;
                                                const pickedMeta = teamColors[pickedTeam] || {};
                                                const pickedPrimary = pickedTeam === game.away_team ? (game.away_color || teamColors[game.away_team]?.color || "#000000") : (pickedTeam === game.home_team ? (game.home_color || teamColors[game.home_team]?.color || "#000000") : (pickedMeta.color || "#000000"));
                                                const pickedLogo = pickedTeam === game.away_team ? game.away_logo : (pickedTeam === game.home_team ? game.home_logo : pickedMeta.logo);
                                                const pickedSecondary = pickedTeam === game.away_team ? (game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1") : (pickedTeam === game.home_team ? (game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1") : (pickedMeta.secondaryColor || "#cbd5e1"));

                                                const cellStyle = getCellStyle(game, pickObj);

                                                return (
                                                    <td key={game.game_id} style={{
                                                        padding: "10px 8px",
                                                        textAlign: "center",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        borderBottom: "1px solid #f3f4f6",
                                                        borderLeft: "1px solid #f1f5f9",
                                                        width: "120px",
                                                        minWidth: "120px",
                                                        overflow: "visible",
                                                        ...cellStyle
                                                    }}>
                                                        {showPick ? (
                                                            pickedTeam ? (
                                                                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", position: "relative", minHeight: "24px" }}>
                                                                    <span style={{
                                                                        background: pickedSecondary,
                                                                        borderRadius: 4,
                                                                        padding: "2px 4px",
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        boxShadow: pickObj.is_best_bet
                                                                            ? `0 0 10px 3px rgba(200, 157, 60, 0.9), 0 0 4px 1px ${pickedPrimary}, 0 1px 2px rgba(0,0,0,0.15)`
                                                                            : `0 0 4px 1px ${pickedPrimary}, 0 1px 2px rgba(0,0,0,0.15)`,
                                                                        border: `2px solid ${pickObj.is_best_bet ? GOLD : pickedPrimary}`
                                                                    }}>
                                                                        {pickedLogo ? (
                                                                            <img src={pickedLogo} alt={pickedTeam} style={{ width: 20, height: 20, objectFit: "contain", display: "block" }} />
                                                                        ) : (
                                                                            <span style={{ fontSize: 10 }}>{pickedTeam}</span>
                                                                        )}
                                                                    </span>
                                                                    {pickObj.is_best_bet && (
                                                                        <span style={{
                                                                            position: "absolute",
                                                                            top: "-4px",
                                                                            right: "4px",
                                                                            fontSize: "8px",
                                                                            background: GOLD,
                                                                            color: "white",
                                                                            padding: "0 2px",
                                                                            borderRadius: 4,
                                                                            fontWeight: 900,
                                                                            boxShadow: "0 2px 6px rgba(200, 157, 60, 0.9)",
                                                                            zIndex: 2,
                                                                            border: "1px solid white"
                                                                        }}>
                                                                            ★
                                                                        </span>
                                                                    )}
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