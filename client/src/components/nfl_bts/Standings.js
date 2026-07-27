import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

const DIVISIONS = [
    "NFC North", "NFC East", "NFC South", "NFC West",
    "AFC North", "AFC East", "AFC South", "AFC West"
];

// Optional: A helper to apply background colors based on division or team for visual flair
const getTeamColor = (teamName) => {
    const colors = {
        "Packers": "#203731", "Vikings": "#4F2683", "Lions": "#0076B6", "Bears": "#0B162A",
        "Cowboys": "#041E42", "Eagles": "#004C54", "Giants": "#0B2265", "Commanders": "#5A1414",
        "Saints": "#D3BC8D", "Buccaneers": "#D50A0A", "Falcons": "#A71930", "Panthers": "#0085CA",
        "49ers": "#AA0000", "Cardinals": "#97233F", "Seahawks": "#002244", "Rams": "#003594",
        "Ravens": "#241773", "Steelers": "#FFB612", "Bengals": "#FB4F14", "Browns": "#311D00",
        "Dolphins": "#008E97", "Bills": "#00338D", "Patriots": "#002244", "Jets": "#125740",
        "Colts": "#002C5F", "Texans": "#03202F", "Titans": "#0C2340", "Jaguars": "#006778",
        "Chiefs": "#E31837", "Raiders": "#000000", "Chargers": "#0080C6", "Broncos": "#FB4F14"
    };
    return colors[teamName] || "#f3f4f6";
};

export default function FootballStandings() {
    const { user, loading: authLoading } = useAuth();
    const [standings, setStandings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");

        // Fetch users, assignments, and calculated records
        axios.get("/api/nfl_bts/standings", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                // Group the incoming array of players by division
                const grouped = res.data.reduce((acc, player) => {
                    if (!acc[player.division]) acc[player.division] = [];
                    acc[player.division].push(player);
                    return acc;
                }, {});

                // Sort players within each division by Wins, then O/U tiebreaker
                Object.keys(grouped).forEach(div => {
                    grouped[div].sort((a, b) => {
                        if (b.ats_wins !== a.ats_wins) return b.ats_wins - a.ats_wins;
                        return b.ou_wins - a.ou_wins;
                    });
                });

                setStandings(grouped);
            })
            .catch(err => console.error("Failed to load standings", err))
            .finally(() => setLoading(false));
    }, [user]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading standings...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 30 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Division Standings</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Ranked by ATS Record (W-L-P). Tiebreaker: Over/Under Record.</p>
                </div>

                {/* CSS Grid to map the 8 divisions nicely */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "20px"
                }}>
                    {DIVISIONS.map(division => (
                        <div key={division} style={{
                            background: "white",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            overflow: "hidden",
                            border: `1px solid #e5e7eb`
                        }}>

                            {/* Division Header */}
                            <div style={{
                                background: division.includes("NFC") ? NFL_BLUE : NFL_RED,
                                color: "white",
                                padding: "10px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                fontWeight: 700,
                                fontSize: "14px"
                            }}>
                                <span>{division}</span>
                                <div style={{ display: "flex", gap: "24px" }}>
                                    <span style={{ width: "50px", textAlign: "center" }}>W-L-P</span>
                                    <span style={{ width: "50px", textAlign: "center" }}>O/U</span>
                                </div>
                            </div>

                            {/* Division Teams */}
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                {standings[division] && standings[division].length > 0 ? (
                                    standings[division].map((player, idx) => (
                                        <div key={player.user_id} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 16px",
                                            borderBottom: idx < 3 ? "1px solid #f3f4f6" : "none",
                                            backgroundColor: player.user_id === user?.id ? "#fef08a" : "transparent" // Highlight current user
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                                                {/* Color Swatch based on team */}
                                                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: getTeamColor(player.team_name) }}></div>
                                                <span style={{ fontWeight: 600, fontSize: "14px" }}>{player.real_name || player.user_name}</span>
                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>({player.team_name})</span>
                                            </div>

                                            <div style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 500 }}>
                                                <span style={{ width: "50px", textAlign: "center" }}>
                                                    {player.ats_wins}-{player.ats_losses}-{player.ats_pushes}
                                                </span>
                                                <span style={{ width: "50px", textAlign: "center", color: "#4b5563" }}>
                                                    {player.ou_wins}-{player.ou_losses}-{player.ou_pushes}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                                        Awaiting 32-player assignment...
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>

            </div>
        </PoolGatekeeper>
    );
}