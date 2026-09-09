import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";
const FALLBACK_BLUE = "#013369";

export default function NflBtsMatrix() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matrixData, setMatrixData] = useState([]);
    const [teamColorsMap, setTeamColorsMap] = useState({});
    const [loading, setLoading] = useState(true);

    const logoStyle = {
        objectFit: "contain",
        display: "block"
    };

    const darkLogoStyle = {
        objectFit: "contain",
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
    };

    // 1. Fetch team metadata for colors and logos
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        axios.get("/api/nfl_teams", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const map = {};
                (res.data || []).forEach(t => {
                    map[t.name] = {
                        color: t.color || t.primary_color || "#0f172a",
                        secondaryColor: t.secondaryColor || t.bg_color || t.alt_color || t.secondary_color || "#cbd5e1",
                        logo: t.logo
                    };
                });
                setTeamColorsMap(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, []);

    // 2. Fetch user entries to check room memberships
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

    // 3. Fetch matrix data for the selected room and week
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

    if (authLoading) return <div style={{ textAlign: "center", padding: 50 }}>Verifying session...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts" className='page-content'>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Weekly Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Picks are hidden until individual game kickoff.</p>
                </div>

                {/* Room Selector Tab Bar */}
                {userEntries.length > 1 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 20,
                        flexWrap: "wrap",
                        width: "100%",
                        boxSizing: "border-box"
                    }}>
                        {[1, 2].map(rId => {
                            const isJoined = userEntries.some(e => Number(e.room_id) === rId);
                            if (!isJoined) return null;
                            const isSelected = selectedRoomId === rId;
                            const label = rId === 1 ? "Room 1 (100 Credit Pool A)" : "Room 2 (100 Credit Pool B)";
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

                <div style={{ textAlign: "center", marginBottom: 1 }}>
                    <h3 style={{ color: NFL_BLUE, fontSize: "15px", margin: 0 }}>Select Week:</h3>
                </div>

                {/* Week Selector Tabs */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    width: "100%",
                    marginBottom: 16,
                    marginTop: 4
                }}>
                    <div style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 6,
                        maxWidth: "100%"
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
                                    fontSize: "14px",
                                    transition: "all 0.2s"
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Matrix Table */}
                <div style={{ background: "white", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflowX: "auto" }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Loading Week {currentWeek} picks for Room {selectedRoomId}...</div>
                    ) : matrixData.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>No data available for Week {currentWeek} in Room {selectedRoomId}.</div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
                            <thead style={{ backgroundColor: NFL_BLUE, color: "white" }}>
                                <tr>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}>Player</th>
                                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 14 }}>Assigned Teams</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>Matchups</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>ATS Picks</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>O/U Picks</th>
                                    <th style={{ padding: "12px 16px", textAlign: "center", fontSize: 14 }}>Results</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.map((row, idx) => {
                                    const isCurrentUser = Number(row.user_id) === Number(user.id);

                                    const t1Meta = teamColorsMap[row.team_name_1] || {};
                                    const t2Meta = teamColorsMap[row.team_name_2] || {};

                                    const t1Color = t1Meta.color || FALLBACK_BLUE;
                                    const t1Sec = t1Meta.secondaryColor || "#cbd5e1";
                                    const t2Color = t2Meta.color || FALLBACK_BLUE;
                                    const t2Sec = t2Meta.secondaryColor || "#cbd5e1";

                                    const rowBackground = isCurrentUser
                                        ? `linear-gradient(135deg, ${t1Color}18 0%, ${t1Sec}18 33%, ${t2Color}18 66%, ${t2Sec}18 100%)`
                                        : (idx % 2 === 0 ? "#fafafa" : "white");

                                    const slots = [
                                        {
                                            team_name: row.team_name_1,
                                            logo: row.logo_1,
                                            primary_color: t1Color,
                                            secondary_color: t1Sec,
                                            game: row.team1_game || {}
                                        },
                                        {
                                            team_name: row.team_name_2,
                                            logo: row.logo_2,
                                            primary_color: t2Color,
                                            secondary_color: t2Sec,
                                            game: row.team2_game || {}
                                        }
                                    ].filter(s => s.team_name);

                                    return (
                                        <tr key={`${row.user_id}-${idx}`} style={{
                                            borderBottom: "1px solid #eee",
                                            background: rowBackground
                                        }}>
                                            <td style={{ padding: "14px 16px", fontWeight: 600, fontSize: 14, verticalAlign: "top" }}>
                                                {row.user_name} {isCurrentUser && "(You)"}
                                            </td>

                                            {/* Assigned Teams Column */}
                                            <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, verticalAlign: "top" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {slots.map((slot, sIdx) => {
                                                        const teamLogo = slot.logo || teamColorsMap[slot.team_name]?.logo;

                                                        return (
                                                            <div key={sIdx} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32 }}>
                                                                {teamLogo ? (
                                                                    <div style={{
                                                                        background: slot.secondary_color,
                                                                        borderRadius: 6,
                                                                        padding: "3px",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        boxShadow: `0 0 4px 1px ${slot.primary_color}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                                        border: `1.5px solid ${slot.primary_color}`,
                                                                        width: 32,
                                                                        height: 32,
                                                                        flexShrink: 0
                                                                    }}>
                                                                        <img src={teamLogo} alt={slot.team_name} style={{ width: 22, height: 22, ...logoStyle }} />
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ width: 32, height: 32, flexShrink: 0 }} />
                                                                )}
                                                                <span style={{ fontWeight: 600 }}>{slot.team_name || "Unassigned"}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Matchups Column */}
                                            <td style={{ padding: "14px 16px", fontSize: 13, verticalAlign: "top" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {slots.map((slot, sIdx) => {
                                                        const g = slot.game;
                                                        return (
                                                            <div key={sIdx} style={{ minHeight: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                                                {g.away_team && g.home_team ? (
                                                                    <>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                                                                            {g.away_logo && (
                                                                                <img src={g.away_logo} alt={g.away_team} style={{ width: 14, height: 14, ...darkLogoStyle, display: "block", flexShrink: 0 }} />
                                                                            )}
                                                                            <span>{g.away_team} @ {g.home_team}</span>
                                                                            {g.home_logo && (
                                                                                <img src={g.home_logo} alt={g.home_team} style={{ width: 14, height: 14, ...darkLogoStyle, display: "block", flexShrink: 0 }} />
                                                                            )}
                                                                        </div>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#666", fontSize: 11, marginTop: 2, flexWrap: "wrap" }}>
                                                                            <span>
                                                                                {g.game_date ? new Date(g.game_date).toLocaleString([], {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit'
                                                                                }) : "TBD"} CT
                                                                            </span>
                                                                            <span>|</span>
                                                                            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                                                <span>Line:</span>
                                                                                {g.favorite_logo && (
                                                                                    <img src={g.favorite_logo} alt="Fav" style={{ width: 12, height: 12, ...darkLogoStyle, display: "block" }} />
                                                                                )}
                                                                                <span>{g.adjusted_spread ?? g.spread}</span>
                                                                            </div>
                                                                            <span>|</span>
                                                                            <span>O/U: {g.over_under}</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <span style={{ color: "#9ca3af" }}>No game scheduled</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* ATS Picks Column */}
                                            <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, verticalAlign: "top" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {slots.map((slot, sIdx) => {
                                                        const g = slot.game;
                                                        const isRevealed = canRevealPick(g.game_date);
                                                        const pickVal = g.ats_pick;
                                                        const pickLogo = pickVal && (pickVal.toLowerCase() === g.away_team?.toLowerCase() ? g.away_logo : g.home_logo);
                                                        const pMeta = pickVal ? (teamColorsMap[pickVal] || {}) : {};
                                                        const pickColor = pMeta.color || FALLBACK_BLUE;
                                                        const pickSec = pMeta.secondaryColor || "#cbd5e1";

                                                        return (
                                                            <div key={sIdx} style={{ minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {isRevealed || isCurrentUser ? (
                                                                    pickVal ? (
                                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                                            {pickLogo && (
                                                                                <div style={{
                                                                                    background: pickSec,
                                                                                    borderRadius: 6,
                                                                                    padding: "3px",
                                                                                    display: "flex",
                                                                                    alignItems: "center",
                                                                                    justifyContent: "center",
                                                                                    boxShadow: `0 0 4px 1px ${pickColor}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                                                    border: `1.5px solid ${pickColor}`,
                                                                                    width: 28,
                                                                                    height: 28,
                                                                                    flexShrink: 0
                                                                                }}>
                                                                                    <img src={pickLogo} alt={pickVal} style={{ width: 20, height: 20, ...logoStyle }} />
                                                                                </div>
                                                                            )}
                                                                            <span style={{ color: NFL_BLUE, fontWeight: 700 }}>
                                                                                {pickVal}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ color: "#9ca3af" }}>No Pick</span>
                                                                    )
                                                                ) : (
                                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* O/U Picks Column */}
                                            <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14, fontWeight: 600, verticalAlign: "top" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {slots.map((slot, sIdx) => {
                                                        const g = slot.game;
                                                        const isRevealed = canRevealPick(g.game_date);
                                                        let ouDisplay = g.ou_pick;
                                                        if (ouDisplay) {
                                                            const lowerOu = ouDisplay.toLowerCase();
                                                            if (lowerOu.includes("over")) ouDisplay = `⬆️ ${ouDisplay}`;
                                                            else if (lowerOu.includes("under")) ouDisplay = `⬇️ ${ouDisplay}`;
                                                        }
                                                        return (
                                                            <div key={sIdx} style={{ minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {isRevealed || isCurrentUser ? (
                                                                    <span style={{ color: g.ou_pick ? NFL_BLUE : "#9ca3af" }}>
                                                                        {ouDisplay || "No Pick"}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: "#d97706" }}>🔒 Hidden</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Results Column */}
                                            <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 14, fontWeight: 700, verticalAlign: "top" }}>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {slots.map((slot, sIdx) => {
                                                        const status = slot.game.status;
                                                        return (
                                                            <div key={sIdx} style={{ minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                {status === "win" && <span style={{ color: "#16a34a" }}>Win</span>}
                                                                {status === "loss" && <span style={{ color: NFL_RED }}>Loss</span>}
                                                                {status === "push" && <span style={{ color: "#ca8a04" }}>Push</span>}
                                                                {!status && <span style={{ color: "#9ca3af" }}>--</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
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