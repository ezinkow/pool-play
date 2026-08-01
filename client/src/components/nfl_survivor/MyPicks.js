import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

export default function NflSurvivorMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [allPicks, setAllPicks] = useState([]); // Array of picks across all weeks
    const [gamesMap, setGamesMap] = useState({}); // Map of gameId -> game details
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
                        primaryColor: t.color || t.primary_color || NFL_BLUE,
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    // Fetch all user picks and games across weeks
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        // Fetch picks for all weeks (1 to 18) or fetch a comprehensive endpoint if available.
        // Here we fetch all 18 weeks concurrently to build the full history list.
        const weekPromises = [...Array(18)].map((_, i) =>
            axios.get("/api/nfl_survivor/picks", {
                params: { week: i + 1 },
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => ({ week: i + 1, data: res.data || {} })).catch(() => null)
        );

        Promise.all(weekPromises)
            .then(results => {
                const picksList = [];
                const gMap = {};

                results.forEach(item => {
                    if (!item) return;
                    const { week, data } = item;
                    const weekPicks = data.userPicks || {};
                    const pickedTeam = weekPicks[week];

                    // Map games for lookup
                    (data.games || []).forEach(g => {
                        gMap[g.id] = g;
                    });

                    if (pickedTeam) {
                        // Find game for this team & week
                        const matchedGame = (data.games || []).find(
                            g => g.away_team === pickedTeam || g.home_team === pickedTeam
                        );
                        picksList.push({
                            week,
                            pickedTeam,
                            game: matchedGame || null
                        });
                    }
                });

                setAllPicks(picksList.sort((a, b) => a.week - b.week));
                setGamesMap(gMap);
            })
            .catch(err => {
                console.error("Failed to load user survivor picks history", err);
                toast.error("Failed to load pick history");
            })
            .finally(() => setLoading(false));
    }, [user, token]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading your survivor history...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor">
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>My Survivor Selection History</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Your complete season-long survivor progression and team choices.
                    </p>
                </div>

                {allPicks.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "40px",
                        textAlign: "center",
                        color: "#64748b",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        border: "1px solid #e2e8f0"
                    }}>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>You haven't made any survivor picks yet!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {allPicks.map(({ week, pickedTeam, game }) => {
                            const pickedTeamMeta = teamColors[pickedTeam] || {};

                            // Determine status badge
                            let statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "12px" }}>⏳ Pending Game</span>;
                            if (game && game.winner) {
                                if (game.winner === "PUSH") {
                                    statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "12px" }}>— PUSH (Survived)</span>;
                                } else if (game.winner === pickedTeam) {
                                    statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "12px" }}>✓ WIN (Advanced)</span>;
                                } else {
                                    statusBadge = <span style={{ color: NFL_RED, fontWeight: 800, fontSize: "12px" }}>✕ LOSS (Eliminated)</span>;
                                }
                            }

                            return (
                                <div key={week} style={{
                                    background: pickedTeamMeta.primaryColor || "#ffffff",
                                    color: "#ffffff",
                                    borderRadius: 12,
                                    boxShadow: `0 4px 16px ${pickedTeamMeta.primaryColor || "#000"}33`,
                                    padding: "18px 22px",
                                    border: `2px solid ${pickedTeamMeta.secondaryColor || "#cbd5e1"}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85, fontWeight: 700 }}>
                                                Week {week} Selection
                                            </span>
                                            <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 800 }}>
                                                {pickedTeam}
                                            </h3>
                                        </div>

                                        {pickedTeamMeta.logo && (
                                            <div style={{
                                                background: pickedTeamMeta.secondaryColor || "rgba(255,255,255,0.2)",
                                                padding: "6px 10px",
                                                borderRadius: 8,
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                                border: "1px solid rgba(255,255,255,0.2)"
                                            }}>
                                                <img src={pickedTeamMeta.logo} alt={pickedTeam} style={{ width: 38, height: 38, objectFit: "contain" }} />
                                            </div>
                                        )}
                                    </div>

                                    {game && (
                                        <div style={{
                                            background: "rgba(0, 0, 0, 0.2)",
                                            borderRadius: 8,
                                            padding: "10px 14px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            fontSize: "13px"
                                        }}>
                                            <span style={{ fontWeight: 600 }}>{game.away_team} @ {game.home_team}</span>
                                            {game.home_score !== null && game.away_score !== null ? (
                                                <span style={{ background: "#0f172a", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: "11px", fontWeight: 700 }}>
                                                    Final: {game.away_score} - {game.home_score}
                                                </span>
                                            ) : (
                                                <span style={{ opacity: 0.9, fontSize: "11px" }}>Kickoff Pending</span>
                                            )}
                                        </div>
                                    )}

                                    <div style={{
                                        background: "white",
                                        color: "#0f172a",
                                        padding: "8px 14px",
                                        borderRadius: 6,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontWeight: 700,
                                        fontSize: "13px"
                                    }}>
                                        <span>Status:</span>
                                        {statusBadge}
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