import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflBtsMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matrixData, setMatrixData] = useState([]);
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

    // 2. Fetch matrix data for the selected room and week
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        setLoading(true);

        axios.get("/api/nfl_bts/matrix", {
            params: { week: currentWeek, room_id: selectedRoomId },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const data = res.data;
                if (Array.isArray(data)) {
                    setMatrixData(data);
                } else if (data && Array.isArray(data.data)) {
                    setMatrixData(data.data);
                } else if (data && Array.isArray(data.matrix)) {
                    setMatrixData(data.matrix);
                } else {
                    setMatrixData([]);
                }
            })
            .catch(err => {
                console.error("Failed to load user picks", err);
                setMatrixData([]);
            })
            .finally(() => setLoading(false));
    }, [user, currentWeek, selectedRoomId]);

    const canRevealPick = (gameDate) => {
        if (!gameDate) return false;
        return new Date() >= new Date(gameDate);
    };

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

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Weekly Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Picks are hidden until individual game kickoff.</p>
                </div>

                {/* Room Selector Tab Bar (Shown if user joined multiple rooms) */}
                {userEntries.length > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
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
                                        fontSize: "13px"
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div style={{ textAlign: "center", marginBottom: 1 }}>
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
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} picks for Room {selectedRoomId}...</div>
                    ) : matrixData.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>No data available for Week {currentWeek} in Room {selectedRoomId}.</div>
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
                                        <tr key={`${row.user_id}-${row.team_name}`} style={{
                                            borderBottom: "1px solid #eee",
                                            backgroundColor: isCurrentUser ? "#fef08a" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td style={{ padding: "12px 16px", fontWeight: 600, fontSize: 14 }}>
                                                {row.user_name} {isCurrentUser && "(You)"}
                                            </td>

                                            <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 500 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    {row.logo && (
                                                        <img src={row.logo} alt={row.team_name} style={{ width: 24, height: 24, objectFit: "contain" }} />
                                                    )}
                                                    <span>{row.team_name || "Unassigned"}</span>
                                                </div>
                                            </td>

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

                                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#666", fontSize: 11, marginTop: 4, flexWrap: "wrap" }}>
                                                    <span>
                                                        {row.game_date ? new Date(row.game_date).toLocaleString([], {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) : "TBD"} CT
                                                    </span>
                                                    <span>|</span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                        <span>Line:</span>
                                                        {row.favorite_logo ? (
                                                            <img src={row.favorite_logo} alt={row.favorite_team || "Favorite"} style={{ width: 16, height: 16, objectFit: "contain" }} />
                                                        ) : null}
                                                        <span>{row.adjusted_spread}</span>
                                                    </div>
                                                    <span>|</span>
                                                    <span>O/U: {row.over_under}</span>
                                                </div>
                                            </td>

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

                                            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                                                {isRevealed || isCurrentUser ? (
                                                    <span style={{ color: row.ou_pick ? NFL_BLUE : "#9ca3af" }}>
                                                        {ouDisplay || "No Pick"}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                )}
                                            </td>

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