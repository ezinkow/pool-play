import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflPickemAtsMyPicks() {
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
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || NFL_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    // Fetch weekly schedule and user picks summary
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        axios.get("/api/nfl_pickem_ats/mypicks", {
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
    }, [user, currentWeek]);

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

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading your picks summary...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_pickem_ats">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>My Week {currentWeek} Summary</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
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
                                backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
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
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {games.map(game => {
                        const userPick = picks[game.id];
                        const pickedTeam = userPick?.picked_team;
                        const isBestBet = userPick?.is_best_bet;
                        const ouPick = userPick?.ou_pick;

                        const teamMeta = teamColors[pickedTeam] || {};
                        const teamColor = teamMeta.color || NFL_BLUE;
                        const teamSecondary = teamMeta.secondaryColor || "#64748b";

                        const awayMeta = teamColors[game.away_team] || {};
                        const homeMeta = teamColors[game.home_team] || {};
                        const awayLogo = game.away_logo || awayMeta.logo;
                        const homeLogo = game.home_logo || homeMeta.logo;
                        const pickedLogo = game.away_team === pickedTeam ? awayLogo : (game.home_team === pickedTeam ? homeLogo : teamMeta.logo);

                        const isFinished = game.ats_winner !== null && game.ats_winner !== undefined;

                        // ATS Status Badge
                        let statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "11px" }}>⏳ Pending</span>;
                        if (isFinished) {
                            if (game.ats_winner === "PUSH") {
                                statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "11px" }}>— PUSH</span>;
                            } else if (game.ats_winner === pickedTeam) {
                                statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "11px" }}>✓ WIN ({isBestBet ? "+2" : "+1"})</span>;
                            } else {
                                statusBadge = <span style={{ color: NFL_RED, fontWeight: 800, fontSize: "11px" }}>✕ LOSS</span>;
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
                                    ouColor = NFL_RED;
                                }
                            }
                            ouBadge = <span style={{ color: ouColor, fontWeight: 700, fontSize: "10px", marginLeft: 4 }}>{ouText}</span>;
                        }

                        const absSpread = Math.abs(game.adjusted_spread || game.spread || 3.0);
                        const isAwayFav = game.favorite === game.away_team;
                        const awaySpreadStr = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                        const homeSpreadStr = isAwayFav ? `+${absSpread}` : `-${absSpread}`;

                        return (
                            <div key={game.id} style={{
                                background: "white",
                                borderRadius: 10,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                                padding: "10px 14px",
                                borderLeft: `5px solid ${isBestBet ? GOLD : (pickedTeam ? teamColor : "#cbd5e1")}`,
                                borderTop: "1px solid #e2e8f0",
                                borderRight: "1px solid #e2e8f0",
                                borderBottom: "1px solid #e2e8f0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 10
                            }}>
                                {/* Left: Matchup & Final Score */}
                                <div style={{ display: "flex", flexDirection: "column", minWidth: "130px" }}>
                                    <div className="matchup-header-row" style={{ fontSize: "17px", color: "#1e2229", fontWeight: 500, display: "flex", gap: 4, alignItems: "center" }}>
                                        <span className="team-display" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                            {awayLogo && <img src={awayLogo} alt={game.away_team} style={{ width: 30, height: 30, objectFit: "contain" }} />}
                                            <span className="team-text">{game.away_team}</span> ({awaySpreadStr})
                                        </span>
                                        <span style={{ color: "#40464e" }}>@</span>
                                        <span className="team-display" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                                            {homeLogo && <img src={homeLogo} alt={game.home_team} style={{ width: 30, height: 30, objectFit: "contain" }} />}
                                            <span className="team-text">{game.home_team}</span> ({homeSpreadStr})
                                        </span>
                                    </div>
                                    {game.home_score !== null && game.away_score !== null && (
                                        <span style={{ background: "#0f172a", color: "white", padding: "1px 4px", borderRadius: 3, fontSize: "10px", marginTop: 3, width: "fit-content" }}>
                                            Final: {game.away_score} - {game.home_score}
                                        </span>
                                    )}
                                    {ouBadge && <div style={{ marginTop: 2 }}>{ouBadge}</div>}
                                </div>

                                {/* Right: Pick Logo, Best Bet Badge, and Status */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    {isBestBet && (
                                        <span style={{ background: GOLD, color: "white", fontSize: "9px", padding: "2px 6px", borderRadius: 4, fontWeight: 900 }}>
                                            ★ BEST BET
                                        </span>
                                    )}

                                    {pickedTeam ? (
                                        <div style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            background: `${teamSecondary}26`, 
                                            padding: "2px 2px", 
                                            borderRadius: 6, 
                                            border: `1px solid ${teamSecondary}40` 
                                        }}>
                                            {pickedLogo && <img src={pickedLogo} alt={pickedTeam} style={{ width: 50, height: 50, objectFit: "contain" }} />}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>No Pick</span>
                                    )}

                                    <div style={{ minWidth: "75px", textAlign: "right" }}>
                                        {statusBadge}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <style>{`
                    @media (max-width: 576px) {
                        .team-text {
                            display: none !important;
                        }
                    }
                `}</style>

            </div>
        </PoolGatekeeper>
    );
}