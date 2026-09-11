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
                        const isTeam1A = a.display_team === a.team_name_1;
                        const isTeam1B = b.display_team === b.team_name_1;

                        const aAtsWins = Number(isTeam1A ? a.ats_wins_1 : a.ats_wins_2) || 0;
                        const bAtsWins = Number(isTeam1B ? b.ats_wins_1 : b.ats_wins_2) || 0;
                        if (bAtsWins !== aAtsWins) return bAtsWins - aAtsWins;

                        const aAtsLosses = Number(isTeam1A ? a.ats_losses_1 : a.ats_losses_2) || 0;
                        const bAtsLosses = Number(isTeam1B ? b.ats_losses_1 : b.ats_losses_2) || 0;
                        // Fewer losses is better if wins are tied
                        if (aAtsLosses !== bAtsLosses) return aAtsLosses - bAtsLosses;

                        const aOuWins = Number(isTeam1A ? a.ou_wins_1 : a.ou_wins_2) || 0;
                        const bOuWins = Number(isTeam1B ? b.ou_wins_1 : b.ou_wins_2) || 0;
                        if (bOuWins !== aOuWins) return bOuWins - aOuWins;

                        const aOuLosses = Number(isTeam1A ? a.ou_losses_1 : a.ou_losses_2) || 0;
                        const bOuLosses = Number(isTeam1B ? b.ou_losses_1 : b.ou_losses_2) || 0;
                        return aOuLosses - bOuLosses;
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
                                    display: "grid",
                                    gridTemplateColumns: "1fr 32px 1fr 50px 50px",
                                    alignItems: "center",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    gap: "8px"
                                }}>
                                    <span style={{ gridColumn: "1 / span 3" }}>{division}</span>
                                    <span style={{ textAlign: "center" }}>W-L</span>
                                    <span style={{ textAlign: "center" }}>O/U</span>
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

                                            const isTeam1 = teamName === player.team_name_1;
                                            const atsWins = isTeam1 ? (player.ats_wins_1 ?? 0) : (player.ats_wins_2 ?? 0);
                                            const atsLosses = isTeam1 ? (player.ats_losses_1 ?? 0) : (player.ats_losses_2 ?? 0);
                                            const ouWins = isTeam1 ? (player.ou_wins_1 ?? 0) : (player.ou_wins_2 ?? 0);
                                            const ouLosses = isTeam1 ? (player.ou_losses_1 ?? 0) : (player.ou_losses_2 ?? 0);

                                            return (
                                                <div key={`${player.user_id}-${division}-${teamName}-${idx}`} style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 32px 1fr 50px 50px",
                                                    alignItems: "center",
                                                    padding: "10px 16px",
                                                    borderBottom: idx < divisionPlayers.length - 1 ? "1px solid #f3f4f6" : "none",
                                                    background: rowBackground,
                                                    gap: "8px"
                                                }}>
                                                    <span style={{ fontWeight: 600, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {player.user_name} {isCurrentUser && "(You)"}
                                                    </span>

                                                    <div style={{ display: "flex", justifyContent: "center" }}>
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
                                                    </div>

                                                    <span style={{ fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                        {teamName}
                                                    </span>

                                                    <span style={{ textAlign: "center", fontSize: "14px", fontWeight: 600 }}>
                                                        {atsWins}-{atsLosses}
                                                    </span>
                                                    <span style={{ textAlign: "center", fontSize: "14px", fontWeight: 600, color: "#4b5563" }}>
                                                        {ouWins}-{ouLosses}
                                                    </span>
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