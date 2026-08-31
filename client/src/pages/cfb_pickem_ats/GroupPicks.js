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

            const atsWinner = row.ats_winner || row.winner;
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
        
        if (!isFinal && !game.ats_winner && !game.winner) return { backgroundColor: "transparent" };

        const st = pickObj.status;
        const atsWinner = game.ats_winner || game.winner;
        if (st === "win" || st === "correct" || (atsWinner && atsWinner === pickObj.ats_pick)) {
            return { backgroundColor: "#dcfce7", color: "#166534" }; // Soft Green
        } else if (st === "push" || st === "tie" || atsWinner === "PUSH") {
            return { backgroundColor: "#fef3c2", color: "#b45309" }; // Soft Yellow
        } else if (atsWinner && atsWinner !== pickObj.ats_pick) {
            return { backgroundColor: "#fee2e2", color: "#991b1b" }; // Soft Red
        }
        
        return { backgroundColor: "transparent" };
    };

    const GameHeader = ({ game }) => {
        const rawStatus = (game.status || "").toUpperCase();
        const isFinal = rawStatus === "STATUS_FINAL" || rawStatus === "FINAL" || rawStatus === "COMPLETED";
        const isLive = rawStatus === "STATUS_IN_PROGRESS" || rawStatus === "IN_PROGRESS" || rawStatus === "HALFTIME" || rawStatus === "STATUS_HALFTIME" || rawStatus === "LIVE";
        const hasScores = game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined;

        const coveredTeam = game.ats_winner || game.winner;
        const coveredLogo = coveredTeam === game.away_team ? game.away_logo : (coveredTeam === game.home_team ? game.home_logo : null);
        const isFavCovered = coveredTeam === game.favorite;
        const rawSpread = game.adjusted_spread !== null && game.adjusted_spread !== undefined ? parseFloat(game.adjusted_spread) : null;
        
        const spreadLabel = rawSpread !== null ? (isFavCovered ? (rawSpread < 0 ? rawSpread : -Math.abs(rawSpread)) : (rawSpread > 0 ? `+${rawSpread}` : `+${Math.abs(rawSpread)}`)) : "";

        const awayPrimary = game.away_color || teamColors[game.away_team]?.color || "#000000";
        const awaySecondary = game.away_secondary_color || teamColors[game.away_team]?.secondaryColor || "#cbd5e1";
        
        const homePrimary = game.home_color || teamColors[game.home_team]?.color || "#000000";
        const homeSecondary = game.home_secondary_color || teamColors[game.home_team]?.secondaryColor || "#cbd5e1";

        const favTeam = game.favorite;
        const favLogo = favTeam === game.away_team ? game.away_logo : (favTeam === game.home_team ? game.home_logo : teamColors[favTeam]?.logo);
        const favPrimary = favTeam === game.away_team ? awayPrimary : (favTeam === game.home_team ? homePrimary : (teamColors[favTeam]?.color || "#000000"));
        const favSecondary = favTeam === game.away_team ? awaySecondary : (favTeam === game.home_team ? homeSecondary : (teamColors[favTeam]?.secondaryColor || "#cbd5e1"));

        const coveredMeta = teamColors[coveredTeam] || {};
        const coveredPrimary = coveredTeam === game.away_team ? awayPrimary : (coveredTeam === game.home_team ? homePrimary : (coveredMeta.color || "#000000"));
        const coveredSecondary = coveredTeam === game.away_team ? awaySecondary : (coveredTeam === game.home_team ? homeSecondary : (coveredMeta.secondaryColor || "#cbd5e1"));

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
        const favBadgeStyle = getBadgeStyle(favPrimary, favSecondary);
        const coveredBadgeStyle = getBadgeStyle(coveredPrimary, coveredSecondary);

        return (
            <div style={{ textAlign: "center", width: "100%", overflow: "visible" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 4, padding: "3px 2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={awayBadgeStyle}>
                            {game.away_logo && <img src={game.away_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
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
                            {game.home_logo && <img src={game.home_logo} alt="" height={16} style={{ flexShrink: 0, objectFit: "contain" }} />}
                        </span>
                    </div>
                </div>

                <div style={{ fontSize: 9, fontWeight: 700, margin: "3px 0" }}>
                    {isFinal ? (
                        <span style={{ backgroundColor: "#16a34a", color: "white", padding: "1px 6px", borderRadius: 3 }}>FINAL</span>
                    ) : isLive ? (
                        <span style={{ backgroundColor: CFB_RED, color: "white", padding: "1px 6px", borderRadius: 3 }}>LIVE</span>
                    ) : (
                        <span style={{ color: "#cbd5e1" }}>
                            {game.game_date ? new Date(game.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD"}
                        </span>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 3, height: 18 }}>
                    {isFinal && coveredLogo && coveredTeam !== "PUSH" ? (
                        <>
                            <span style={coveredBadgeStyle}>
                                <img src={coveredLogo} alt="" height={13} style={{ flexShrink: 0, objectFit: "contain" }} />
                            </span>
                            <span style={{ fontSize: 9, color: isFavCovered ? "#86efac" : "#fca5a5", fontWeight: 700 }}>
                                {spreadLabel}
                            </span>
                        </>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {favLogo && (
                                <span style={favBadgeStyle}>
                                    <img src={favLogo} alt={favTeam} height={12} style={{ flexShrink: 0, objectFit: "contain" }} />
                                </span>
                            )}
                            <span style={{ fontSize: 9, color: GOLD, fontWeight: 600 }}>
                                {rawSpread !== null ? (rawSpread < 0 ? rawSpread : `-${rawSpread}`) : "Pick'em"}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats" className='page-content'>
            <div style={{ maxWidth: "100%", margin: "0 auto", padding: "12px 4px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 12, padding: "0 8px" }}>
                    <h2 style={{ color: CFB_BLUE, fontSize: "20px", margin: 0 }}>🏈 Weekly Group Matrix</h2>
                    <p style={{ color: "#64748b", marginTop: 4, fontSize: "12px" }}>Picks unlock at game kickoff. Scores update live.</p>
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
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: currentWeek === i + 1 ? CFB_BLUE : "white",
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

                <div style={{
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
                        <div style={{ padding: 30, textAlign: "center", color: "#666" }}>No entries or games found for Week {currentWeek}.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, whiteSpace: "nowrap", tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ backgroundColor: CFB_BLUE, color: "white" }}>
                                    <th style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 10,
                                        backgroundColor: CFB_BLUE,
                                        padding: "10px 12px",
                                        textAlign: "left",
                                        fontSize: 12,
                                        width: "130px",
                                        minWidth: "130px",
                                        boxShadow: "2px 0 5px rgba(0,0,0,0.1)"
                                    }}>
                                        Player (Pts)
                                    </th>
                                    {gamesList.map((game) => (
                                        <th key={game.game_id} style={{
                                            padding: "8px 6px",
                                            textAlign: "center",
                                            fontSize: "11px",
                                            borderLeft: "1px solid rgba(255,255,255,0.15)",
                                            width: "120px",
                                            minWidth: "120px",
                                            backgroundColor: game.must_pick ? "#b45309" : CFB_BLUE,
                                            overflow: "visible"
                                        }}>
                                            <GameHeader game={game} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPlayers.map((player, idx) => {
                                    // Calculate standard competitive ranking (ties share the same rank)
                                    const rank = sortedPlayers.filter(p => p.totalPoints > player.totalPoints).length + 1;
                                    const isCurrentUser = Number(player.user_id) === Number(user.id);
                                    const playerLabel = `${rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} ${player.user_name} ${isCurrentUser ? "(You)" : ""}`;
                                    const ptsLabel = player.totalPoints === 1 ? "1 pt" : `${player.totalPoints} pts`;

                                    return (
                                        <tr key={player.user_id} style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td 
                                                title={playerLabel}
                                                style={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 5,
                                                    backgroundColor: isCurrentUser ? "#dbeafe" : (idx % 2 === 0 ? "#fafafa" : "white"),
                                                    padding: "10px 12px",
                                                    fontWeight: isCurrentUser ? 800 : 600,
                                                    fontSize: 12,
                                                    color: "#0f172a",
                                                    width: "130px",
                                                    minWidth: "130px",
                                                    maxWidth: "130px",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    boxShadow: "2px 0 5px rgba(0,0,0,0.05)"
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", overflow: "hidden" }}>
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4 }}>
                                                        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`} {player.user_name} {isCurrentUser && "(You)"}
                                                    </span>
                                                    <span style={{ fontWeight: 800, color: CFB_BLUE, flexShrink: 0 }}>
                                                        {ptsLabel}
                                                    </span>
                                                </div>
                                            </td>

                                            {gamesList.map((game) => {
                                                const pickObj = player.picks[game.game_id];
                                                const isRevealed = canRevealPick(game.game_date);
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
                                                        borderLeft: "1px solid #e2e8f0",
                                                        borderBottom: "1px solid #f3f4f6",
                                                        width: "120px",
                                                        minWidth: "120px",
                                                        overflow: "visible",
                                                        ...cellStyle
                                                    }}>
                                                        {showPick ? (
                                                            pickedTeam ? (
                                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, overflow: "visible" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "visible" }}>
                                                                        <span style={{
                                                                            background: pickedSecondary,
                                                                            borderRadius: 4,
                                                                            padding: "2px 4px",
                                                                            display: "inline-flex",
                                                                            alignItems: "center",
                                                                            boxShadow: `0 0 4px 1px ${pickedPrimary}, 0 1px 2px rgba(0,0,0,0.15)`,
                                                                            border: `2px solid ${pickedPrimary}`,
                                                                            margin: "2px"
                                                                        }}>
                                                                            {pickedLogo ? (
                                                                                <img src={pickedLogo} alt={pickedTeam} style={{ width: 20, height: 20, objectFit: "contain" }} />
                                                                            ) : (
                                                                                <span style={{ fontSize: 10 }}>{pickedTeam}</span>
                                                                            )}
                                                                        </span>
                                                                        {pickObj.is_best_bet && (
                                                                            <span style={{ fontSize: "9px", background: GOLD, color: "white", padding: "1px 3px", borderRadius: 3, fontWeight: 900, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                                                                                ★
                                                                            </span>
                                                                        )}
                                                                    </div>
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