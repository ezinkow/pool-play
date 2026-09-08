import React, { useState, useEffect } from "react";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const FALLBACK_BLUE = "#013369";

const DIVISIONS = [
    "NFC North", "NFC East", "NFC South", "NFC West",
    "AFC North", "AFC East", "AFC South", "AFC West"
];

export default function NflBtsStandings() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [standings, setStandings] = useState({});
    const [teamColorsMap, setTeamColorsMap] = useState({});
    const [loading, setLoading] = useState(true);

    const logoStyle = {
        objectFit: "contain",
        display: "block"
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

    // 3. Fetch standings for the selected room
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        setLoading(true);

        axios.get("/api/nfl_bts/standings", {
            params: { room_id: selectedRoomId },
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const data = res.data;
                const rawList = Array.isArray(data) ? data : (data.standings || data.data || []);

                const grouped = {};
                DIVISIONS.forEach(d => { grouped[d] = []; });

                // Split each user row into respective divisional entries using division_1 / division_2
                rawList.forEach(player => {
                    if (player.team_name_1 && player.division_1) {
                        if (!grouped[player.division_1]) grouped[player.division_1] = [];
                        grouped[player.division_1].push({
                            ...player,
                            display_team: player.team_name_1,
                            display_logo: player.logo_1,
                            display_division: player.division_1
                        });
                    }
                    if (player.team_name_2 && player.division_2) {
                        if (!grouped[player.division_2]) grouped[player.division_2] = [];
                        grouped[player.division_2].push({
                            ...player,
                            display_team: player.team_name_2,
                            display_logo: player.logo_2,
                            display_division: player.division_2
                        });
                    }
                });

                Object.keys(grouped).forEach(div => {
                    grouped[div].sort((a, b) => {
                        const aAtsWins = Number(a.ats_wins) || 0;
                        const bAtsWins = Number(b.ats_wins) || 0;
                        if (bAtsWins !== aAtsWins) return bAtsWins - aAtsWins;

                        const aOuWins = Number(a.ou_wins) || 0;
                        const bOuWins = Number(b.ou_wins) || 0;
                        return bOuWins - aOuWins;
                    });
                });

                setStandings(grouped);
            })
            .catch(err => console.error("Failed to load standings", err))
            .finally(() => setLoading(false));
    }, [user, selectedRoomId]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading standings...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts" className='page-content'>
            <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 12px", paddingBottom: 80 }}>

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "28px", margin: 0 }}>Division Standings</h2>
                    <p style={{ color: "#666", marginTop: 8 }}>Ranked by ATS Record (W-L). Tiebreaker: Over/Under Record.</p>
                </div>

                {/* Room Selector Tab Bar */}
                {userEntries.length > 1 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "flex-start",
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                    gap: "20px"
                }}>
                    {DIVISIONS.map(division => {
                        const divisionPlayers = standings[division] || [];

                        return (
                            <div key={division} style={{
                                background: "white",
                                borderRadius: "10px",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
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
                                    {divisionPlayers.length > 0 ? (
                                        divisionPlayers.map((player, idx) => {
                                            const isCurrentUser = Number(player.user_id) === Number(user?.id);

                                            const teamName = player.display_team;
                                            const teamLogo = player.display_logo;

                                            const tMeta = teamColorsMap[teamName] || {};
                                            const teamColor = tMeta.color || FALLBACK_BLUE;
                                            const teamSec = tMeta.secondaryColor || "#cbd5e1";
                                            const finalLogo = teamLogo || tMeta.logo;

                                            const rowBackground = isCurrentUser
                                                ? `linear-gradient(135deg, ${teamColor}18 0%, ${teamSec}18 100%)`
                                                : (idx % 2 === 0 ? "#fafafa" : "white");

                                            const atsWins = player.ats_wins ?? 0;
                                            const atsLosses = player.ats_losses ?? 0;
                                            const ouWins = player.ou_wins ?? 0;
                                            const ouLosses = player.ou_losses ?? 0;

                                            return (
                                                <div key={`${player.user_id}-${division}-${teamName}-${idx}`} style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "10px 16px",
                                                    borderBottom: idx < divisionPlayers.length - 1 ? "1px solid #f3f4f6" : "none",
                                                    background: rowBackground
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                                                        <span style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {player.user_name} {isCurrentUser && "(You)"}
                                                        </span>

                                                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                                            {finalLogo ? (
                                                                <div style={{
                                                                    background: teamSec,
                                                                    borderRadius: 5,
                                                                    padding: "2px",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    boxShadow: `0 0 3px 1px ${teamColor}, 0 1px 2px rgba(0,0,0,0.15)`,
                                                                    border: `1.2px solid ${teamColor}`,
                                                                    width: 24,
                                                                    height: 24,
                                                                    flexShrink: 0
                                                                }}>
                                                                    <img src={finalLogo} alt={teamName} style={{ width: 16, height: 16, ...logoStyle }} />
                                                                </div>
                                                            ) : null}
                                                            <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>{teamName}</span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 600, flexShrink: 0 }}>
                                                        <span style={{ width: "50px", textAlign: "center" }}>
                                                            {atsWins}-{atsLosses}
                                                        </span>
                                                        <span style={{ width: "50px", textAlign: "center", color: "#4b5563" }}>
                                                            {ouWins}-{ouLosses}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                                            No entries in this division yet.
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })}
                </div>

            </div>
        </PoolGatekeeper>
    );
}