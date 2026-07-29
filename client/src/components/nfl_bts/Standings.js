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

export default function NflBtsStandings() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [standings, setStandings] = useState({});
    const [loading, setLoading] = useState(true);

    // 1. Fetch user entries to check room memberships
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        axios.get("/api/nfl_bts/entries/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const entries = res.data.entries || [];
                setUserEntries(entries);
                if (entries.length > 0) {
                    if (!entries.some(e => Number(e.room_id) === selectedRoomId)) {
                        setSelectedRoomId(Number(entries[0].room_id));
                    }
                }
            })
            .catch(err => console.error("Error loading user entries", err));
    }, [user]);

    // 2. Fetch standings for the selected room
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        setLoading(true);

        axios.get("/api/nfl_bts/standings", {
            params: { room_id: selectedRoomId },
            headers: { Authorization: `Bearer ${token}` }
        })
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
    }, [user, selectedRoomId]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading standings...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Division Standings</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Ranked by ATS Record (W-L). Tiebreaker: Over/Under Record.</p>
                </div>

                {/* Room Selector Tab Bar (Shown if user joined multiple rooms) */}
                {userEntries.length > 1 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "flex-start", // Allows proper scrolling room starting from the left edge
                        gap: 8,
                        marginBottom: 20,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        paddingBottom: 6,
                        width: "100%",
                        boxSizing: "border-box"
                    }}>
                        {[1, 2, 3].map(rId => {
                            const isJoined = userEntries.some(e => Number(e.room_id) === rId);
                            if (!isJoined) return null;
                            const isSelected = selectedRoomId === rId;
                            const label = rId === 1 ? "Room 1 (50 Cr)" : rId === 2 ? "Room 2 (100 Cr A)" : "Room 3 (100 Cr B)";
                            return (
                                <button
                                    key={rId}
                                    onClick={() => setSelectedRoomId(rId)}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 8,
                                        border: `2px solid ${NFL_BLUE}`,
                                        background: isSelected ? NFL_BLUE : "white",
                                        color: isSelected ? "white" : NFL_BLUE,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        flexShrink: 0,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

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
                                        <div key={`${player.user_id}-${player.team_name}`} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px 16px",
                                            borderBottom: idx < standings[division].length - 1 ? "1px solid #f3f4f6" : "none",
                                            backgroundColor: Number(player.user_id) === Number(user?.id) ? "#fef08a" : "transparent"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                                                {player.logo && (
                                                    <img src={player.logo} alt={player.team_name} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                                                )}
                                                <span style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.user_name}</span>
                                                <span style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>({player.team_name})</span>
                                            </div>

                                            <div style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 500, flexShrink: 0 }}>
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