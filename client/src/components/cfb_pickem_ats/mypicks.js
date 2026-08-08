import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function CdbPickemAtsMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({});
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch team branding mapping
    useEffect(() => {
        if (!token) return;
        axios.get("/api/cfb_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || CFB_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load CFB team colors", err));
    }, [token]);

    // Fetch weekly schedule and user picks summary
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/cfb_pickem_ats/mypicks", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setGames(res.data.games || []);
                setPicks(res.data.userPicks || {});
            })
            .catch(err => {
                console.error("Failed to load user picks", err);
                toast.error("Failed to load pick summary");
            })
            .finally(() => setLoading(false));
    }, [user, currentWeek, token]);

    // Calculate total points and records dynamically using ats_winner from the game
    let totalPoints = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;

    games.forEach(game => {
        const userPick = picks[game.id];
        if (!userPick || !userPick.picked_team) return;

        if (game.ats_winner !== null && game.ats_winner !== undefined) {
            if (game.ats_winner === "PUSH") {
                pushes++;
            } else if (game.ats_winner === userPick.picked_team) {
                wins++;
                totalPoints += userPick.is_best_bet ? 2 : 1;
            } else {
                losses++;
            }
        }
    });

    // Filter games to ONLY show the ones the user has actually picked
    const pickedGames = games.filter(game => {
        const userPick = picks[game.id];
        return userPick && userPick.picked_team;
    });

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading your picks summary...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: CFB_BLUE, fontSize: "26px", margin: 0, fontWeight: 800, letterSpacing: "-0.025em" }}>My Week {currentWeek} Summary</h2>
                    <p style={{ color: "#64748b", marginTop: 6, fontSize: "14px", fontWeight: 500 }}>
                        Review your ATS selections, Best Bet outcomes, and Over/Under picks.
                    </p>

                    {/* Score / Stats Banner */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                        <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#334155" }}>
                            Record: {wins} - {losses} {pushes > 0 ? `- ${pushes}` : ""}
                        </div>
                        <div style={{ background: "#ecfdf5", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#047857" }}>
                            Total Points: {totalPoints} pts
                        </div>
                    </div>
                </div>

                {/* Week Selector Bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 6,
                    marginBottom: 20,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 6,
                    width: "100%"
                }}>
                    {[...Array(18)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? CFB_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "14px"
                            }}
                        >
                            Week {i + 1}
                        </button>
                    ))}
                </div>

                {/* Compact Picks List */}
                {pickedGames.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "40px 20px",
                        textAlign: "center",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                        <p style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                            No picks saved for Week {currentWeek} yet.
                        </p>
                        <p style={{ fontSize: "14px", color: "#64748b", marginTop: 8, marginBottom: 0 }}>
                            Head over to the matchups page to submit your 15 ATS selections!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {pickedGames.map(game => {
                            const userPick = picks[game.id];
                            const pickedTeam = userPick?.picked_team;
                            const isBestBet = userPick?.is_best_bet;
                            const ouPick = userPick?.ou_pick;
                            const isMustPick = game.must_pick;

                            const teamMeta = teamColors[pickedTeam] || {};
                            const teamColor = teamMeta.color || CFB_BLUE;

                            const awayMeta = teamColors[game.away_team] || {};
                            const homeMeta = teamColors[game.home_team] || {};
                            const awayLogo = game.away_logo || awayMeta.logo;
                            const homeLogo = game.home_logo || homeMeta.logo;

                            const awaySecondary = game.away_secondary_color || awayMeta.secondaryColor || "#cbd5e1";
                            const homeSecondary = game.home_secondary_color || homeMeta.secondaryColor || "#cbd5e1";

                            const isPickedAway = pickedTeam === game.away_team;
                            const isPickedHome = pickedTeam === game.home_team;

                            const pickedLogo = isPickedAway ? awayLogo : (isPickedHome ? homeLogo : teamMeta.logo);
                            const pickedSecondary = isPickedAway 
                                ? awaySecondary
                                : (isPickedHome ? homeSecondary : (teamMeta.secondaryColor || "#cbd5e1"));

                            const isFinished = game.ats_winner !== null && game.ats_winner !== undefined;
                            const hasScores = game.home_score !== null && game.home_score !== undefined &&
                                              game.away_score !== null && game.away_score !== undefined &&
                                              (game.home_score > 0 || game.away_score > 0 || game.status === "STATUS_FINAL" || game.status === "Final" || game.status === "completed");

                            // ATS Status Badge
                            let statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "11px" }}>⏳ Pending</span>;
                            if (isFinished) {
                                if (game.ats_winner === "PUSH") {
                                    statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "11px" }}>— PUSH</span>;
                                } else if (game.ats_winner === pickedTeam) {
                                    statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "11px" }}>✓ WIN ({isBestBet ? "+2" : "+1"})</span>;
                                } else {
                                    statusBadge = <span style={{ color: CFB_RED, fontWeight: 800, fontSize: "11px" }}>✕ LOSS</span>;
                                }
                            }

                            // O/U Result Badge
                            let ouBadge = null;
                            if (ouPick) {
                                let ouText = `${ouPick} (${game.over_under})`;
                                let ouColor = "#64748b";
                                if (game.ou_result && game.ou_result !== "PENDING") {
                                    if (game.ou_result === "PUSH") {
                                        ouText = `O/U PUSH (${game.over_under})`;
                                        ouColor = "#d97706";
                                    } else if (game.ou_result === ouPick) {
                                        ouText = `✓ O/U WIN`;
                                        ouColor = "#16a34a";
                                    } else {
                                        ouText = `✕ O/U LOSS`;
                                        ouColor = CFB_RED;
                                    }
                                }
                                ouBadge = <span style={{ color: ouColor, fontWeight: 700, fontSize: "10px", marginLeft: 4 }}>{ouText}</span>;
                            }

                            const absSpread = Math.abs(game.adjusted_spread || game.spread || 3.0);
                            const isAwayFav = game.favorite === game.away_team;
                            const awaySpreadStr = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                            const homeSpreadStr = isAwayFav ? `+${absSpread}` : `-${absSpread}`;

                            const isAwayPicked = pickedTeam === game.away_team;
                            const isHomePicked = pickedTeam === game.home_team;

                            return (
                                <div key={game.id} style={{
                                    background: isBestBet ? "linear-gradient(135deg, #fffdf4 0%, #ffffff 100%)" : (isMustPick ? "#fffbeb" : "white"),
                                    borderRadius: 12,
                                    boxShadow: isBestBet ? "0 4px 12px rgba(200, 157, 60, 0.15)" : "0 2px 6px rgba(0,0,0,0.04)",
                                    padding: "12px 16px",
                                    borderLeft: `5px solid ${isBestBet ? GOLD : (isMustPick ? "#f59e0b" : (pickedTeam ? teamColor : "#cbd5e1"))}`,
                                    borderTop: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    borderRight: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    borderBottom: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "nowrap",
                                    gap: 12
                                }}>
                                    {/* Left: Matchup & Final Score */}
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                            {isMustPick && (
                                                <span style={{ fontSize: "10px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>
                                                    ⭐ MUST-PICK
                                                </span>
                                            )}
                                        </div>
                                        <div className="matchup-header-row" style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                                            
                                            {/* Away Team Section */}
                                            <span className="team-display" style={{ 
                                                display: "inline-flex", 
                                                alignItems: "center", 
                                                gap: 5,
                                                background: isAwayPicked ? `${teamColor}12` : "transparent",
                                                padding: isAwayPicked ? "2px 6px" : "0",
                                                borderRadius: 6,
                                                border: isAwayPicked ? `1px solid ${teamColor}30` : "1px solid transparent"
                                            }}>
                                                {awayLogo && (
                                                    <span style={{
                                                        background: awaySecondary,
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                        border: "1px solid rgba(0,0,0,0.06)"
                                                    }}>
                                                        <img src={awayLogo} alt={game.away_team} className="matchup-logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <span className="team-text" style={{ fontWeight: isAwayPicked ? 800 : 600, color: isAwayPicked ? teamColor : "#334155" }}>
                                                    {game.away_team}
                                                </span> 
                                                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>({awaySpreadStr})</span>
                                            </span>

                                            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "12px" }}>@</span>

                                            {/* Home Team Section */}
                                            <span className="team-display" style={{ 
                                                display: "inline-flex", 
                                                alignItems: "center", 
                                                gap: 5,
                                                background: isHomePicked ? `${teamColor}12` : "transparent",
                                                padding: isHomePicked ? "2px 6px" : "0",
                                                borderRadius: 6,
                                                border: isHomePicked ? `1px solid ${teamColor}30` : "1px solid transparent"
                                            }}>
                                                {homeLogo && (
                                                    <span style={{
                                                        background: homeSecondary,
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                                        border: "1px solid rgba(0,0,0,0.06)"
                                                    }}>
                                                        <img src={homeLogo} alt={game.home_team} className="matchup-logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                    </span>
                                                )}
                                                <span className="team-text" style={{ fontWeight: isHomePicked ? 800 : 600, color: isHomePicked ? teamColor : "#334155" }}>
                                                    {game.home_team}
                                                </span> 
                                                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>({homeSpreadStr})</span>
                                            </span>

                                        </div>
                                        {hasScores && (
                                            <span style={{ background: "#0f172a", color: "white", padding: "1px 6px", borderRadius: 4, fontSize: "11px", fontWeight: 700, marginTop: 4, width: "fit-content", letterSpacing: "0.3px" }}>
                                                Final: {game.away_score} - {game.home_score}
                                            </span>
                                        )}
                                        {ouBadge && <div style={{ marginTop: 3 }}>{ouBadge}</div>}
                                    </div>

                                    {/* Right: Pick Logo & Status / Best Bet Column */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            background: pickedSecondary, 
                                            padding: "3px 6px", 
                                            borderRadius: 8, 
                                            border: "1px solid rgba(0,0,0,0.08)",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                        }}>
                                            {pickedLogo && <img src={pickedLogo} alt={pickedTeam} style={{ width: 30, height: 30, objectFit: "contain" }} />}
                                        </div>

                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, minWidth: "75px" }}>
                                            {statusBadge}
                                            {isBestBet && (
                                                <span style={{ background: GOLD, color: "white", fontSize: "9px", padding: "2px 5px", borderRadius: 4, fontWeight: 900, letterSpacing: "0.5px", boxShadow: "0 1px 3px rgba(200, 157, 60, 0.4)" }}>
                                                    ★ BEST BET
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <style>{`
                    @media (max-width: 576px) {
                        .team-text {
                            display: none !important;
                        }
                        .matchup-header-row {
                            font-size: 13px !important;
                        }
                        .matchup-logo {
                            width: 16px !important;
                            height: 16px !important;
                        }
                    }
                `}</style>

            </div>
        </PoolGatekeeper>
    );
}