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

        axios.get("/api/nfl_bts/matrix", {
            params: { week: currentWeek },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => setMatrixData(res.data))
            .catch(err => console.error("Failed to load user picks", err))
            .finally(() => setLoading(false));
    }, [user, currentWeek]);

    const canRevealPick = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

    // Helper to find the correct logo for an ATS team pick
    const getLogoForTeam = (teamName, row) => {
        if (!teamName) return null;
        if (teamName.toLowerCase() === row.away_team?.toLowerCase()) return row.away_logo;
        if (teamName.toLowerCase() === row.home_team?.toLowerCase()) return row.home_logo;
        return null;
    };

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Weekly Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Picks are hidden until individual game kickoff.</p>
                </div>
                <div style={{ textAlign: "center", marginBottom: 1}}>
                    <h3 style={{ color: NFL_BLUE, fontSize: "15px", margin: 0 }}>Select Week:</h3>
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
                        {i + 1}
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
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
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
                                    const isCurrentUser = Number(row.user_id) === Number(user.id);
                                    const atsLogo = getLogoForTeam(row.ats_pick, row);

                                    // Determine Over/Under Emoji
                                    let ouDisplay = row.ou_pick;
                                    if (ouDisplay) {
                                        const lowerOu = ouDisplay.toLowerCase();
                                        if (lowerOu.includes("over")) {
                                            ouDisplay = `⬆️ ${ouDisplay}`;
                                        } else if (lowerOu.includes("under")) {
                                            ouDisplay = `⬇️ ${ouDisplay}`;
                                        }
                                    }

                                    return (
                                        <tr key={row.user_id} style={{
                                            borderBottom: "1px solid #eee",
                                            backgroundColor: isCurrentUser ? "#fef08a" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            {/* Player Column */}
                                            <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>
                                                {row.user_name} {isCurrentUser && "(You)"}
                                            </td>

                                            {/* Assigned Team Column with Logo from nfl_bts_teams */}
                                            <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    {row.team_logo && (
                                                        <img src={row.team_logo} alt={row.team_name} style={{ width: 24, height: 24, objectFit: "contain" }} />
                                                    )}
                                                    <span>{row.team_name || "Unassigned"}</span>
                                                </div>
                                            </td>

                                            {/* Matchup Column */}
                                            <td style={{ padding: "12px 16px", fontSize: 13 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
                                                    {row.away_logo && (
                                                        <img src={row.away_logo} alt={row.away_team} style={{ width: 24, height: 24, objectFit: "contain" }} />
                                                    )}
                                                    <span>{row.away_team} @ {row.home_team}</span>
                                                    {row.home_logo && (
                                                        <img src={row.home_logo} alt={row.home_team} style={{ width: 24, height: 24, objectFit: "contain" }} />
                                                    )}
                                                </div>
                                                <div style={{ color: "#666", fontSize: 11, marginTop: 2 }}>
                                                    {row.game_date ? new Date(row.game_date).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : "TBD"} CT | Line: {row.adjusted_spread} | O/U: {row.over_under}
                                                </div>
                                            </td>

                                            {/* ATS Pick Column */}
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                                                {isRevealed || isCurrentUser ? (
                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                                        {atsLogo && (
                                                            <img src={atsLogo} alt={row.ats_pick} style={{ width: 20, height: 20, objectFit: "contain" }} />
                                                        )}
                                                        <span style={{ color: row.ats_pick ? NFL_BLUE : "#9ca3af" }}>
                                                            {row.ats_pick || "No Pick"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                )}
                                            </td>

                                            {/* O/U Pick Column */}
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                                                {isRevealed || isCurrentUser ? (
                                                    <span style={{ color: row.ou_pick ? NFL_BLUE : "#9ca3af" }}>
                                                        {ouDisplay || "No Pick"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                )}
                                            </td>

                                            {/* Result Column */}
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