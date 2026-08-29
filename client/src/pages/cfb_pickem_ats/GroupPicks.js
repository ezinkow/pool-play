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
                    home_logo: row.home_logo || teamColors[row.home_team]?.logo,
                    home_color: row.home_color,
                    home_secondary_color: row.home_secondary_color,
                    away_color: row.away_color,
                    away_secondary_color: row.away_secondary_color,
                    game_date: row.game_date,
                    adjusted_spread: row.adjusted_spread,
                    favorite: row.favorite,
                    winner: row.winner,
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

                {/* Week Selector Tabs */}
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

                {/* Scrollable Matrix Table */}
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
                                        minWidth: "160px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
                                    }}>
                                        Player (Pts)
                                    </th>
                                    {gamesList.map((game) => {
                                        const favTeam = game.favorite;
                                        const isFavAway = favTeam === game.away_team;
                                        const isFavHome = favTeam === game.home_team;

                                        const favLogo = isFavAway ? game.away_logo : (isFavHome ? game.home_logo : null);
                                        const favSecondary = isFavAway
                                            ? (game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1")
                                            : (isFavHome ? (game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1") : "#cbd5e1");

                                        const homeSecondary = game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1";
                                        const awaySecondary = game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1";

                                        const rawStatus = (game.status || "").toUpperCase();
                                        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED";
                                        const isLive = rawStatus === "STATUS_IN_PROGRESS" || rawStatus === "IN_PROGRESS" || rawStatus === "LIVE";
                                        const hasScores = game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined;

                                        return (
                                            <th key={game.game_id} style={{
                                                padding: "8px 10px",
                                                textAlign: "center",
                                                fontSize: "11px",
                                                borderLeft: "1px solid rgba(255,255,255,0.15)",
                                                minWidth: "105px",
                                                backgroundColor: game.must_pick ? "#b45309" : "transparent"
                                            }}>
                                                {/* Away Team Logo & Score */}
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2, padding: "0 4px" }}>
                                                    <div style={{ background: awaySecondary, borderRadius: 3, padding: "1px 3px", display: "inline-flex", alignItems: "center" }}>
                                                        {game.away_logo && <img src={game.away_logo} alt={game.away_team} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: hasScores ? "#fef08a" : "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                                                        {hasScores ? game.away_score : "-"}
                                                    </span>
                                                </div>

                                                {/* Home Team Logo & Score */}
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, padding: "0 4px" }}>
                                                    <div style={{ background: homeSecondary, borderRadius: 3, padding: "1px 3px", display: "inline-flex", alignItems: "center" }}>
                                                        {game.home_logo && <img src={game.home_logo} alt={game.home_team} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: hasScores ? "#fef08a" : "rgba(255,255,255,0.4)", fontSize: "13px" }}>
                                                        {hasScores ? game.home_score : "-"}
                                                    </span>
                                                </div>

                                                {/* Status Badge */}
                                                <div style={{ marginBottom: 3 }}>
                                                    {isFinal ? (
                                                        <span style={{ fontSize: "8px", backgroundColor: "#16a34a", color: "white", padding: "1px 4px", borderRadius: 3, fontWeight: 800 }}>FINAL</span>
                                                    ) : isLive ? (
                                                        <span style={{ fontSize: "8px", backgroundColor: CFB_RED, color: "white", padding: "1px 4px", borderRadius: 3, fontWeight: 800 }}>LIVE</span>
                                                    ) : (
                                                        <span style={{ fontSize: "9px", color: "#e2e8f0", fontWeight: 600 }}>
                                                            {game.game_date ? new Date(game.game_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD"}
                                                        </span>
                                                    )}
                                                </div>

                                                {game.must_pick && (
                                                    <div style={{ marginBottom: 2 }}>
                                                        <span style={{ fontSize: "8px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 4px", borderRadius: 3, fontWeight: 900, border: "1px solid #f59e0b", display: "inline-block" }}>
                                                            ⭐ MUST
                                                        </span>
                                                    </div>
                                                )}

                                                <div style={{ fontSize: "9px", color: game.must_pick ? "#fef3c2" : GOLD, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontWeight: 600 }}>
                                                    {favLogo && (
                                                        <span style={{ background: favSecondary, borderRadius: 2, padding: "1px 2px", display: "inline-flex", alignItems: "center" }}>
                                                            <img src={favLogo} alt={game.favorite} style={{ width: 10, height: 10, objectFit: "contain" }} />
                                                        </span>
                                                    )}
                                                    <span>{game.adjusted_spread || "Pick'em"}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
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
                                                    <span>{player.user_name} {isCurrentUser && "(You)"}</span>
                                                    <span style={{ fontWeight: 800, color: CFB_BLUE, marginLeft: 10 }}>
                                                        {player.totalPoints} pts
                                                    </span>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pick = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game.game_date);
                                                const showPick = isRevealed || isCurrentUser;

                                                let status = pick?.status || "";
                                                let pickBg = game.must_pick ? "rgba(254, 243, 199, 0.45)" : "transparent";
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

                                                const pickedTeam = pick?.ats_pick;
                                                const pickedMeta = teamColors[pickedTeam] || {};

                                                const isPickedAway = pickedTeam === game.away_team;
                                                const isPickedHome = pickedTeam === game.home_team;

                                                const pickedLogo = isPickedAway ? game.away_logo : (isPickedHome ? game.home_logo : pickedMeta.logo);
                                                const pickedSecondary = isPickedAway
                                                    ? (game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1")
                                                    : (isPickedHome
                                                        ? (game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1")
                                                        : (pickedMeta.secondaryColor || "#cbd5e1"));

                                                return (
                                                    <td key={game.game_id} style={{
                                                        padding: "6px 10px",
                                                        textAlign: "center",
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        borderLeft: "1px solid #e2e8f0",
                                                        backgroundColor: pickBg,
                                                        color: textColor
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
                                                                            {pickedLogo && <img src={pickedLogo} alt={pickedTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                                                        </span>
                                                                        {pick.is_best_bet && (
                                                                            <span style={{ fontSize: "8px", background: GOLD, color: "white", padding: "1px 2px", borderRadius: 2, fontWeight: 900 }}>
                                                                                ★
                                                                            </span>
                                                                        )}
                                    </div>
                                                                    {pointsDisplay && (
                                                                        <span style={{ fontSize: "10px", fontWeight: 800, opacity: 0.85 }}>
                                                                            ({pointsDisplay})
                                                                        </span>
                                                                    )}
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