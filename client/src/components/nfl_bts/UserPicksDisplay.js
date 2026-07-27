import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function FootballMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matrixData, setMatrixData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        setLoading(true);

        // Fetch the matrix data for the selected week
        axios.get("/api/nfl_bts/matrix", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setMatrixData(res.data))
            .catch(err => console.error("Failed to load user picks", err))
            .finally(() => setLoading(false));
    }, [user, currentWeek]);

    // Helper to determine if we should reveal the pick
    const canRevealPick = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Weekly Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Picks are hidden until individual game kickoff.</p>
                </div>

                {/* Week Selector Tabs */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
                    {[...Array(18)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "8px 14px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? NFL_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                transition: "all 0.2s"
                            }}
                        >
                            Wk {i + 1}
                        </button>
                    ))}
                </div>

                {/* Matrix Table */}
                <div style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto" }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} picks...</div>
                    ) : matrixData.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>No data available for Week {currentWeek}.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                            <thead style={{ backgroundColor: NFL_BLUE, color: "white" }}>
                                <tr>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}>Player</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}>Assigned Team</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}>Matchup (Spread / OU)</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>ATS Pick</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>O/U Pick</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.map((row, idx) => {
                                    const isRevealed = canRevealPick(row.game_date);
                                    const isCurrentUser = row.user_id === user.id;

                                    return (
                                        <tr key={row.user_id} style={{
                                            borderBottom: "1px solid #eee",
                                            backgroundColor: isCurrentUser ? "#fef08a" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>
                                                {row.real_name || row.user_name}
                                            </td>
                                            <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
                                                {row.team_name}
                                            </td>
                                            <td style={{ padding: "12px 16px", fontSize: 13 }}>
                                                <div style={{ fontWeight: 600 }}>{row.away_team} @ {row.home_team}</div>
                                                <div style={{ color: "#666", fontSize: 11 }}>
                                                    Line: {row.adjusted_spread} | O/U: {row.over_under}
                                                </div>
                                            </td>

                                            {/* ATS Pick Column */}
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                                                {isRevealed || isCurrentUser ? (
                                                    <span style={{ color: row.ats_pick ? NFL_BLUE : "#9ca3af" }}>
                                                        {row.ats_pick || "No Pick"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                )}
                                            </td>

                                            {/* O/U Pick Column */}
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                                                {isRevealed || isCurrentUser ? (
                                                    <span style={{ color: row.ou_pick ? NFL_BLUE : "#9ca3af" }}>
                                                        {row.ou_pick || "No Pick"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                )}
                                            </td>

                                            {/* Result / Grading Column */}
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
                                                {row.status === "win" && <span style={{ color: "#16a34a" }}>Win</span>}
                                                {row.status === "loss" && <span style={{ color: NFL_RED }}>Loss</span>}
                                                {row.status === "push" && <span style={{ color: "#ca8a04" }}>Push</span>}
                                                {!row.status && <span style={{ color: "#9ca3af" }}>--</span>}
                                            </td>
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