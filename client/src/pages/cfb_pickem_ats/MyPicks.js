import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useCFBTeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";

const CFB_BLUE = "#013369";
const CFB_RED = "#D50A0A";
const GOLD = "#c89d3c";

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

export default function CdbPickemAtsMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(null);
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading } = useTeamColors(token);

    // Fetch pool settings first to default to the current active week
    useEffect(() => {
        if (!token) return;

        axios.get("/api/cfb_pickem_ats/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.data && res.data.current_week) {
                    setCurrentWeek(Number(res.data.current_week));
                } else {
                    setCurrentWeek(1);
                }
            })
            .catch(err => {
                console.error("Failed to load pool settings", err);
                setCurrentWeek(1);
            });
    }, [token]);

    // Fetch weekly schedule and user picks summary only after currentWeek is initialized
    useEffect(() => {
        if (!user || currentWeek === null) return;
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

    if (authLoading || loading || colorsLoading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading your picks summary...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="cfb_pickem_ats" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                <style>{`
                    @keyframes pulse { 
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
                        70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
                    }
                `}</style>

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

                            const awayTeamMeta = teamColors[game.away_team] || {};
                            const homeTeamMeta = teamColors[game.home_team] || {};

                            const awayLogo = awayTeamMeta.logo || game.away_logo || null;
                            const homeLogo = homeTeamMeta.logo || game.home_logo || null;

                            const awayColor = awayTeamMeta.primaryColor || game.away_color || "#1e3a8a";
                            const awaySecondary = awayTeamMeta.secondaryColor || game.away_secondary_color || "#cbd5e1";

                            const homeColor = homeTeamMeta.primaryColor || game.home_color || "#1e3a8a";
                            const homeSecondary = homeTeamMeta.secondaryColor || game.home_secondary_color || "#cbd5e1";

                            const isAwayPicked = pickedTeam === game.away_team;
                            const isHomePicked = pickedTeam === game.home_team;

                            const isFinished = game.ats_winner !== null && game.ats_winner !== undefined;
                            const rawStatus = (game.status || "").toUpperCase();
                            const isLive = rawStatus === "STATUS_IN_PROGRESS" || rawStatus === "IN_PROGRESS" || rawStatus === "HALFTIME" || rawStatus === "STATUS_HALFTIME" || rawStatus === "LIVE" || rawStatus.includes("HALF") || rawStatus.includes("PROGRESS");
                            const hasStarted = isLive || isFinished || (game.game_date && new Date() >= new Date(game.game_date));
                            const hasScores = game.home_score !== null && game.home_score !== undefined &&
                                game.away_score !== null && game.away_score !== undefined;

                            // Right-side Status / Live Score display
                            let statusBadge = null;
                            if (isFinished) {
                                if (game.ats_winner === "PUSH") {
                                    statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "11px" }}>— PUSH</span>;
                                } else if (game.ats_winner === pickedTeam) {
                                    statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "11px" }}>✓ WIN ({isBestBet ? "+2" : "+1"})</span>;
                                } else {
                                    statusBadge = <span style={{ color: CFB_RED, fontWeight: 800, fontSize: "11px" }}>✕ LOSS</span>;
                                }
                            } else if (hasStarted) {
                                statusBadge = (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={PULSE_STYLE} />
                                            <span style={{ backgroundColor: CFB_RED, color: "white", padding: "1px 5px", borderRadius: 3, fontSize: "9px", fontWeight: 700 }}>LIVE</span>
                                        </div>
                                        {hasScores && (
                                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>
                                                {game.away_score} - {game.home_score}
                                            </span>
                                        )}
                                    </div>
                                );
                            } else {
                                const formattedKickoff = game.game_date ? new Date(game.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "TBD";
                                statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "11px" }}>🕒 {formattedKickoff}</span>;
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
                                ouBadge = <span style={{ color: ouColor, fontWeight: 700, fontSize: "10px", marginTop: 2, display: "inline-block" }}>{ouText}</span>;
                            }

                            const absSpread = Math.abs(game.adjusted_spread || game.spread || 3.0);
                            const isAwayFav = game.favorite === game.away_team;
                            const awaySpreadStr = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                            const homeSpreadStr = isAwayFav ? `+${absSpread}` : `-${absSpread}`;

                            const pickedPrimary = isAwayPicked ? awayColor : (isHomePicked ? homeColor : CFB_BLUE);
                            const pickedSecondary = isAwayPicked ? awaySecondary : (isHomePicked ? homeSecondary : "#cbd5e1");
                            const pickedLogo = isAwayPicked ? awayLogo : (isHomePicked ? homeLogo : null);

                            return (
                                <div key={game.id} style={{
                                    background: isBestBet ? "linear-gradient(135deg, #fffdf4 0%, #ffffff 100%)" : (isMustPick ? "#fffbeb" : "white"),
                                    borderRadius: 12,
                                    boxShadow: isBestBet ? "0 4px 12px rgba(200, 157, 60, 0.15)" : "0 2px 6px rgba(0,0,0,0.04)",
                                    padding: "12px 16px",
                                    borderLeft: `5px solid ${isBestBet ? GOLD : (isMustPick ? "#f59e0b" : (pickedTeam ? pickedPrimary : "#cbd5e1"))}`,
                                    borderTop: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    borderRight: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    borderBottom: isBestBet ? `1px solid ${GOLD}40` : (isMustPick ? "1px solid #f59e0b40" : "1px solid #e2e8f0"),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "nowrap",
                                    gap: 12
                                }}>
                                    {/* Left: Matchup */}
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "visible" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                            {isMustPick && (
                                                <span style={{ fontSize: "10px", backgroundColor: "#fef3c2", color: "#b45309", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>
                                                    ⭐ MUST-PICK
                                                </span>
                                            )}
                                        </div>
                                        <div className="matchup-header-row" style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600, display: "flex", gap: 8, alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap", overflow: "visible" }}>

                                            {/* Away Team Section */}
                                            <span className="team-display" style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                                backgroundImage: isAwayPicked
                                                    ? `linear-gradient(to right, ${awayColor} 100%, ${awayColor} 100%)`
                                                    : `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 0%, transparent 0%), linear-gradient(135deg, ${awayColor}26 0%, ${awaySecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isAwayPicked ? awayColor : "transparent",
                                                padding: isAwayPicked ? "4px 8px" : "2px 4px",
                                                borderRadius: 6,
                                                border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}30`,
                                                boxShadow: isAwayPicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${awayColor}` : "none",
                                                overflow: "visible"
                                            }}>
                                                {awayLogo && (
                                                    <span style={{
                                                        background: awaySecondary,
                                                        borderRadius: 6,
                                                        padding: "3px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        boxShadow: `0 0 4px 1px ${awayColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                        border: `1.5px solid ${awayColor}`,
                                                        width: 24,
                                                        height: 24,
                                                        overflow: "visible",
                                                        flexShrink: 0
                                                    }}>
                                                        <img src={awayLogo} alt={game.away_team} className="matchup-logo" style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                    </span>
                                                )}
                                                <span className="team-text" style={{ fontWeight: isAwayPicked ? 800 : 600, color: isAwayPicked ? "#ffffff" : "#0f172a" }}>
                                                    {game.away_team}
                                                </span>
                                                <span style={{ fontSize: "12px", color: isAwayPicked ? "#e2e8f0" : "#475569", fontWeight: 700 }}>({awaySpreadStr})</span>
                                            </span>

                                            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "12px" }}>@</span>

                                            {/* Home Team Section */}
                                            <span className="team-display" style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 5,
                                                backgroundImage: isHomePicked
                                                    ? `linear-gradient(to right, ${homeColor} 100%, ${homeColor} 100%)`
                                                    : `linear-gradient(to right, ${homeColor} 0%, ${homeColor} 0%, transparent 0%), linear-gradient(135deg, ${homeColor}26 0%, ${homeSecondary}26 50%, #f8fafc 100%)`,
                                                backgroundColor: isHomePicked ? homeColor : "transparent",
                                                padding: isHomePicked ? "4px 8px" : "2px 4px",
                                                borderRadius: 6,
                                                border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}30`,
                                                boxShadow: isHomePicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${homeColor}` : "none",
                                                overflow: "visible"
                                            }}>
                                                {homeLogo && (
                                                    <span style={{
                                                        background: homeSecondary,
                                                        borderRadius: 6,
                                                        padding: "3px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        boxShadow: `0 0 4px 1px ${homeColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                        border: `1.5px solid ${homeColor}`,
                                                        width: 24,
                                                        height: 24,
                                                        overflow: "visible",
                                                        flexShrink: 0
                                                    }}>
                                                        <img src={homeLogo} alt={game.home_team} className="matchup-logo" style={{ width: 16, height: 16, objectFit: "contain", display: "block" }} />
                                                    </span>
                                                )}
                                                <span className="team-text" style={{ fontWeight: isHomePicked ? 800 : 600, color: isHomePicked ? "#ffffff" : "#0f172a" }}>
                                                    {game.home_team}
                                                </span>
                                                <span style={{ fontSize: "12px", color: isHomePicked ? "#e2e8f0" : "#475569", fontWeight: 700 }}>({homeSpreadStr})</span>
                                            </span>

                                        </div>
                                        {ouBadge && <div>{ouBadge}</div>}
                                    </div>

                                    {/* Right: Status/Live Score first, then Pick Logo with unblocked Star badge */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, overflow: "visible" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", minWidth: "85px" }}>
                                            {statusBadge}
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            position: "relative",
                                            width: 47,
                                            height: 41,
                                            flexShrink: 0
                                        }}>
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                background: pickedSecondary,
                                                padding: "3px",
                                                borderRadius: 6,
                                                border: `1.5px solid ${pickedPrimary}`,
                                                boxShadow: isBestBet 
                                                    ? `0 0 10px 3px rgba(200, 157, 60, 0.9), 0 0 4px 1px ${pickedPrimary}, 0 1px 3px rgba(0,0,0,0.15)`
                                                    : `0 0 4px 1px ${pickedPrimary}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                width: 35,
                                                height: 35,
                                                justifyContent: "center",
                                                boxSizing: "border-box"
                                            }}>
                                                {pickedLogo && <img src={pickedLogo} alt={pickedTeam} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />}
                                            </div>
                                            {isBestBet && (
                                                <span style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    right: 0,
                                                    fontSize: "10px",
                                                    background: GOLD,
                                                    color: "white",
                                                    padding: "1px 4px",
                                                    borderRadius: 4,
                                                    fontWeight: 900,
                                                    boxShadow: "0 2px 6px rgba(200, 157, 60, 0.9)",
                                                    zIndex: 10,
                                                    border: "1px solid white",
                                                    lineHeight: "1"
                                                }}>
                                                    ★
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
                            width: 14px !important;
                            height: 14px !important;
                        }
                    }
                `}</style>

            </div>
        </PoolGatekeeper>
    );
}