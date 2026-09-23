import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import useTeamColors from '../../hooks/useCFBTeamColors';
import PoolGatekeeper from "../../components/PoolGatekeeper";

const BOWL_BLUE = "#0369a1";
const BOWL_DARK = "#0a1628";
const BOWL_RED = "#D50A0A";
const GOLD = "#c89d3c";

// Condensation-optimized pulsing live indicator
const PULSE_STYLE = {
    width: "6px",
    height: "6px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    display: "inline-block",
    boxShadow: "0 0 0 rgba(34, 197, 94, 0.4)",
    animation: "pulse 2s infinite"
};

export default function CfbBowlConfidenceMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [games, setGames] = useState([]);
    const [picks, setPicks] = useState({});
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");
    const { teamColors, loading: colorsLoading } = useTeamColors(token);

    // Fetch user's bowl picks summary and overall standings
    useEffect(() => {
        if (!token) return;

        setLoading(true);
        Promise.all([
            axios.get("/api/cfb_bowl_pickem/mypicks", {
                headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get("/api/cfb_bowl_pickem/standings", {
                headers: { Authorization: `Bearer ${token}` }
            })
        ])
            .then(([picksRes, standingsRes]) => {
                setGames(picksRes.data.games || picksRes.data || []);
                setPicks(picksRes.data.userPicks || picksRes.data.picks || {});
                setStandings(standingsRes.data || []);
            })
            .catch(err => {
                console.error("Failed to load bowl picks or standings", err);
                toast.error("Failed to load bowl picks summary");
            })
            .finally(() => setLoading(false));
    }, [token]);

    // Calculate bowl records and total points dynamically based on game outcomes
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;

    games.forEach(game => {
        const userPick = picks[game.id];
        const confPts = Number(userPick?.confidence_points) || 0;
        
        if (userPick && userPick.picked_team) {
            totalPointsPossible += confPts;
        }

        if (game.winner !== null && game.winner !== undefined) {
            if (game.winner === "PUSH") {
                pushes++;
            } else if (game.winner === userPick?.picked_team) {
                wins++;
                totalPointsEarned += confPts;
            } else if (userPick?.picked_team) {
                losses++;
            }
        }
    });

    // Find overall points for the current logged-in user from standings
    const currentUserStanding = standings.find(s => Number(s.user_id) === Number(user?.id));
    const overallPoints = currentUserStanding ? (Number(currentUserStanding.total_points) || 0) : totalPointsEarned;

    // Filter games to ONLY show the ones the user has actually picked, sorted by highest confidence first
    const pickedGames = games.filter(game => {
        const userPick = picks[game.id];
        return userPick && userPick.picked_team;
    }).sort((a, b) => {
        const ptsA = Number(picks[a.id]?.confidence_points) || 0;
        const ptsB = Number(picks[b.id]?.confidence_points) || 0;
        return ptsB - ptsA;
    });

    if (authLoading || loading || colorsLoading) {
        return <div style={{ textAlign: "center", padding: 50, fontFamily: "system-ui, -apple-system, sans-serif" }}>Loading your bowl picks summary...</div>;
    }

    return (
        <PoolGatekeeper user={user} gameKey="cfb_bowl_pickem" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                <Toaster />

                <style>{`
                    @keyframes pulse { 
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 
                        70% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); } 
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } 
                    }
                `}</style>

                {/* Header Section */}
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h2 style={{ color: BOWL_BLUE, fontSize: "26px", margin: 0, fontWeight: 800, letterSpacing: "-0.025em" }}>
                        🏆 My Bowl Confidence Picks
                    </h2>
                    <p style={{ color: "#64748b", marginTop: 6, fontSize: "14px", fontWeight: 500 }}>
                        Review your confidence rankings, team selections, and game outcomes.
                    </p>

                    {/* Stats Banner */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                        <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#334155" }}>
                            Record: {wins} - {losses} {pushes > 0 ? `- ${pushes}` : ""}
                        </div>
                        <div style={{ background: "#f8fafc", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: BOWL_BLUE, border: "1px solid #e2e8f0" }}>
                            Points Earned: {totalPointsEarned} pts
                        </div>
                        <div style={{ background: "#ecfdf5", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "13px", color: "#047857" }}>
                            Standings Points: {overallPoints} pts
                        </div>
                    </div>
                </div>

                {/* Picks List */}
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
                            No bowl confidence picks saved yet.
                        </p>
                        <p style={{ fontSize: "14px", color: "#64748b", marginTop: 8, marginBottom: 0 }}>
                            Head over to the Bowl Confidence Matchups page to rank your teams and submit your picks!
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {pickedGames.map(game => {
                            const userPick = picks[game.id] || {};
                            const pickedTeam = userPick.picked_team;
                            const confidencePts = userPick.confidence_points || "-";

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

                            const isFinished = game.winner !== null && game.winner !== undefined;
                            const rawStatus = (game.status || "").toUpperCase();
                            const isLive = rawStatus.includes("PROGRESS") || rawStatus.includes("LIVE") || rawStatus.includes("HALF");
                            const hasStarted = isLive || isFinished || (game.game_date && new Date() >= new Date(game.game_date));
                            const hasScores = game.home_score !== null && game.home_score !== undefined &&
                                game.away_score !== null && game.away_score !== undefined;

                            let statusBadge = null;
                            const liveStatusText = game.live_status || "LIVE";

                            if (isFinished) {
                                if (game.winner === "PUSH") {
                                    statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "11px" }}>— PUSH</span>;
                                } else if (game.winner === pickedTeam) {
                                    statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "11px" }}>✓ WIN (+{confidencePts})</span>;
                                } else {
                                    statusBadge = <span style={{ color: BOWL_RED, fontWeight: 800, fontSize: "11px" }}>✕ LOSS</span>;
                                }
                            } else if (hasStarted) {
                                statusBadge = (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={PULSE_STYLE} />
                                            <span style={{ backgroundColor: BOWL_RED, color: "white", padding: "1px 5px", borderRadius: 3, fontSize: "9px", fontWeight: 700 }}>{liveStatusText}</span>
                                        </div>
                                        {hasScores && (
                                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>
                                                {game.away_score} - {game.home_score}
                                            </span>
                                        )}
                                    </div>
                                );
                            } else {
                                const formattedKickoff = game.game_date ? new Date(game.game_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD";
                                statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "11px" }}>🕒 {formattedKickoff}</span>;
                            }

                            const pickedPrimary = isAwayPicked ? awayColor : (isHomePicked ? homeColor : BOWL_BLUE);
                            const pickedSecondary = isAwayPicked ? awaySecondary : (isHomePicked ? homeSecondary : "#cbd5e1");
                            const pickedLogo = isAwayPicked ? awayLogo : (isHomePicked ? homeLogo : null);

                            return (
                                <div key={game.id} style={{
                                    background: "white",
                                    borderRadius: 10,
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                                    padding: "10px 14px",
                                    borderLeft: `5px solid ${pickedPrimary}`,
                                    border: "1px solid #e2e8f0",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10
                                }}>
                                    {/* Confidence Points Badge */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: 6, border: "1px solid #cbd5e1", minWidth: "38px", height: "36px", padding: "0 4px", flexShrink: 0 }}>
                                        <span style={{ fontSize: "13px", fontWeight: 800, color: BOWL_BLUE, textAlign: "center" }}>{confidencePts}</span>
                                    </div>

                                    {/* Bowl Logo, Name & Matchup */}
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                                            {game.bowl_logo && <img src={game.bowl_logo} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />}
                                            <span style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                                                {game.bowl_game || "Bowl Game"}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 600, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                            {/* Away Team */}
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                background: isAwayPicked ? awayColor : "transparent",
                                                padding: isAwayPicked ? "3px 6px" : "2px 3px",
                                                borderRadius: 6,
                                                border: isAwayPicked ? `2px solid #0284c7` : `1px solid ${awayColor}30`,
                                            }}>
                                                {awayLogo && (
                                                    <span style={{ background: awaySecondary, borderRadius: 4, padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${awayColor}`, width: 18, height: 18, flexShrink: 0 }}>
                                                        <img src={awayLogo} alt="" style={{ width: 12, height: 12, objectFit: "contain", display: "block" }} />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: isAwayPicked ? 800 : 600, color: isAwayPicked ? "#ffffff" : "#0f172a", fontSize: "12px" }}>
                                                    {game.away_team}
                                                </span>
                                            </span>

                                            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "11px" }}>@</span>

                                            {/* Home Team */}
                                            <span style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 4,
                                                background: isHomePicked ? homeColor : "transparent",
                                                padding: isHomePicked ? "3px 6px" : "2px 3px",
                                                borderRadius: 6,
                                                border: isHomePicked ? `2px solid #0284c7` : `1px solid ${homeColor}30`,
                                            }}>
                                                {homeLogo && (
                                                    <span style={{ background: homeSecondary, borderRadius: 4, padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${homeColor}`, width: 18, height: 18, flexShrink: 0 }}>
                                                        <img src={homeLogo} alt="" style={{ width: 12, height: 12, objectFit: "contain", display: "block" }} />
                                                    </span>
                                                )}
                                                <span style={{ fontWeight: isHomePicked ? 800 : 600, color: isHomePicked ? "#ffffff" : "#0f172a", fontSize: "12px" }}>
                                                    {game.home_team}
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Side Status & Pick Emblem */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", minWidth: "75px" }}>
                                            {statusBadge}
                                        </div>

                                        <div style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: pickedSecondary,
                                            padding: "3px",
                                            borderRadius: 6,
                                            border: `1.5px solid ${pickedPrimary}`,
                                            width: 32,
                                            height: 32,
                                            boxSizing: "border-box"
                                        }}>
                                            {pickedLogo && <img src={pickedLogo} alt={pickedTeam} style={{ width: 22, height: 22, objectFit: "contain", display: "block" }} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PoolGatekeeper>
    );
}