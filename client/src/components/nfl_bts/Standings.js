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

export default function FootballStandings() {
    const { user, loading: authLoading } = useAuth();
    const [standings, setStandings] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");

        axios.get("/api/nfl_bts/standings", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                const grouped = res.data.reduce((acc, player) => {
                    if (!acc[player.division]) acc[player.division] = [];
                    acc[player.division].push(player);
                    return acc;
                }, {});

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
                    <p style={{ color: "#666", marginTop: 8 }}>Ranked by ATS Record (W-L). Tiebreaker: Over/Under Record.</p>
                </div>

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
                                    <span style={{ width: "50px", textAlign: "center" }}>W-L</span>
                                    <span style={{ width: "50px", textAlign: "center" }}>O/U</span>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column" }}>
                                {standings[division] && standings[division].length > 0 ? (
                                    standings[division].map((player, idx) => (
                                        <div key={player.user_id} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 16px",
                                            borderBottom: idx < 3 ? "1px solid #f3f4f6" : "none",
                                            backgroundColor: Number(player.user_id) === Number(user?.id) ? "#fef08a" : "transparent"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                                {player.logo && (
                                                    <img src={player.logo} alt={player.team_name} style={{ width: 20, height: 20, objectFit: "contain" }} />
                                                )}
                                                <span style={{ fontWeight: 600, fontSize: "14px" }}>{player.user_name}</span>
                                                <span style={{ fontSize: "12px", color: "#6b7280" }}>({player.team_name})</span>
                                            </div>

                                            <div style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 500 }}>
                                                <span style={{ width: "50px", textAlign: "center" }}>
                                                    {player.ats_wins}-{player.ats_losses}
                                                </span>
                                                <span style={{ width: "50px", textAlign: "center", color: "#4b5563" }}>
                                                    {player.ou_wins}-{player.ou_losses}
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