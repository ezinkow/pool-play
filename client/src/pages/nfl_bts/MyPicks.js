import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
const GOLD = "#c89d3c";

export default function NflBtsMyPicks() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [weeksData, setWeeksData] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

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
                        secondaryColor: t.secondary_color || t.alt_color || GOLD,
                        logoBg: t.bg_color || t.logo_bg || t.secondary_color || "rgba(255,255,255,0.2)",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    useEffect(() => {
        if (!user) return;
        axios.get("/api/nfl_bts/entries/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const entries = res.data.entries || res.data || [];
                setUserEntries(entries);
                if (entries.length > 0) {
                    if (!entries.some(e => Number(e.room_id) === selectedRoomId)) {
                        setSelectedRoomId(Number(entries[0].room_id));
                    }
                }
            })
            .catch(err => console.error("Error loading user entries", err));
    }, [user, token]);

    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const weekPromises = [...Array(18)].map(async (_, i) => {
            const week = i + 1;
            try {
                const [pickRes, matchupRes, assignmentRes] = await Promise.all([
                    axios.get("/api/nfl_bts/picks", {
                        params: { week, room_id: selectedRoomId },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: [] })),
                    axios.get("/api/nfl_regular_season_games", {
                        params: { week },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: [] })),
                    axios.get("/api/nfl_bts/assignment", {
                        params: { week, room_id: selectedRoomId },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: null }))
                ]);

                const rawPicks = pickRes.data;
                const picksList = Array.isArray(rawPicks) ? rawPicks : (rawPicks ? [rawPicks] : []);
                const gamesList = Array.isArray(matchupRes.data) ? matchupRes.data : [matchupRes.data].filter(Boolean);
                const assignment = assignmentRes.data;

                if (picksList.length === 0 || !picksList.some(p => p.ats_pick || p.ou_pick)) {
                    return null;
                }

                const team1Name = assignment?.team_name_1 || null;
                const team2Name = assignment?.team_name_2 || null;

                const pick1 = picksList.find(p => p.team_name === team1Name) || picksList[0] || null;
                const pick2 = picksList.find(p => p.team_name === team2Name) || (picksList.length > 1 ? picksList[1] : null);

                return {
                    week,
                    team1: team1Name ? { name: team1Name, pick: pick1, game: gamesList.find(g => g.away_team === team1Name || g.home_team === team1Name) } : null,
                    team2: team2Name ? { name: team2Name, pick: pick2, game: gamesList.find(g => g.away_team === team2Name || g.home_team === team2Name) } : null
                };
            } catch (err) {
                return null;
            }
        });

        Promise.all(weekPromises)
            .then(results => {
                const filtered = results.filter(Boolean).sort((a, b) => a.week - b.week);
                setWeeksData(filtered);
            })
            .catch(err => {
                console.error("Failed to load BTS pick history", err);
                toast.error("Failed to load pick history");
            })
            .finally(() => setLoading(false));
    }, [user, token, selectedRoomId]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading your Beat The Spread history...</div>;

    const renderHistoryCard = (slotData) => {
        if (!slotData || !slotData.name || !slotData.pick) {
            return (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", height: "100%" }}>
                    <p style={{ fontSize: "13px", margin: 0 }}>No pick submitted for this slot.</p>
                </div>
            );
        }

        const { name: teamName, pick, game } = slotData;
        const teamMeta = teamColors[teamName] || {};
        const primaryColor = teamMeta.primaryColor || NFL_BLUE;
        const secondaryColor = teamMeta.secondaryColor || GOLD;
        const logoBgColor = teamMeta.logoBg || "rgba(255,255,255,0.2)";

        const atsPick = pick.ats_pick || "";
        const ouPick = pick.ou_pick || "";

        let spreadDisplay = "";
        if (game && atsPick) {
            const absSpread = Math.abs(game.adjusted_spread ?? game.spread ?? 3.0);
            const favoriteTeam = game.favorite || game.home_team;
            const isAwayFav = favoriteTeam === game.away_team;
            
            if (game.away_team === atsPick) {
                spreadDisplay = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
            } else {
                spreadDisplay = !isAwayFav ? `-${absSpread}` : `+${absSpread}`;
            }
        }

        const opponentTeam = game ? (game.away_team === teamName ? game.home_team : game.away_team) : null;
        const opponentMeta = teamColors[opponentTeam] || {};

        const renderStatusBadge = (status) => {
            if (status === "win") return <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "12px" }}>✓ WIN</span>;
            if (status === "loss") return <span style={{ color: NFL_RED, fontWeight: 800, fontSize: "12px" }}>✕ LOSS</span>;
            if (status === "push") return <span style={{ color: "#d97706", fontWeight: 800, fontSize: "12px" }}>— PUSH</span>;
            if (game && game.game_date && new Date() >= new Date(game.game_date)) {
                return <span style={{ color: "#0284c7", fontWeight: 700, fontSize: "12px" }}>In Progress</span>;
            }
            return <span style={{ color: "#64748b", fontWeight: 700, fontSize: "12px" }}>⏳ Pending</span>;
        };

        return (
            <div style={{
                background: primaryColor,
                color: "#ffffff",
                borderRadius: 10,
                boxShadow: `0 4px 12px ${primaryColor}25`,
                padding: "14px 16px",
                border: `2px solid ${secondaryColor}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                height: "100%"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>
                        <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85, fontWeight: 700 }}>
                            Assigned Team
                        </span>
                        <h4 style={{ margin: "2px 0 0 0", fontSize: "16px", fontWeight: 800 }}>
                            {teamName}
                        </h4>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {game && opponentTeam && (
                            <div style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "rgba(0,0,0,0.25)", padding: "4px 8px", borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 700
                            }}>
                                {teamMeta.logo && <img src={teamMeta.logo} alt={teamName} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                                <span>vs</span>
                                {opponentMeta.logo && <img src={opponentMeta.logo} alt={opponentTeam} style={{ width: 16, height: 16, objectFit: "contain" }} />}
                            </div>
                        )}

                        {teamMeta.logo && (
                            <div style={{ background: logoBgColor, padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)" }}>
                                <img src={teamMeta.logo} alt={teamName} style={{ width: 26, height: 26, objectFit: "contain" }} />
                            </div>
                        )}
                    </div>
                </div>

                {game && (
                    <div style={{
                        background: "rgba(0, 0, 0, 0.2)", borderRadius: 6, padding: "6px 10px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px"
                    }}>
                        <span>{game.away_team} @ {game.home_team}</span>
                        {game.home_score !== null && game.away_score !== null && (game.home_score > 0 || game.away_score > 0 || game.status === "final") ? (
                            <span style={{ background: "#0f172a", color: "white", padding: "2px 5px", borderRadius: 4, fontSize: "10px", fontWeight: 700 }}>
                                {game.status === "final" ? "Final" : "Live"} {game.away_score}-{game.home_score}
                            </span>
                        ) : (
                            <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "2px 5px", borderRadius: 4, fontSize: "10px", fontWeight: 600 }}>
                                Upcoming
                            </span>
                        )}
                    </div>
                )}

                <div style={{
                    background: "white", color: "#0f172a", padding: "8px 10px", borderRadius: 6,
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "11px", fontWeight: 700
                }}>
                    <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "9px", fontWeight: 600 }}>ATS Selection:</span>
                        <span style={{ color: NFL_BLUE }}>{atsPick ? `${atsPick} (${spreadDisplay})` : "None"}</span>
                    </div>
                    <div>
                        <span style={{ color: "#64748b", display: "block", fontSize: "9px", fontWeight: 600 }}>O/U Selection:</span>
                        <span style={{ color: NFL_BLUE }}>{ouPick ? `${ouPick === 'Over' ? '⬆️ Over' : '⬇️ Under'}` : "None"}</span>
                    </div>
                </div>

                <div style={{
                    background: "white", color: "#0f172a", padding: "6px 10px", borderRadius: 6,
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: "11px"
                }}>
                    <span>ATS Result:</span>
                    {renderStatusBadge(pick.ats_status)}
                </div>
            </div>
        );
    };

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts" className='page-content'>
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px 16px", paddingBottom: 90 }}>
                <Toaster />

                <style>{`
                    @media (max-width: 900px) {
                        .bts-history-grid { grid-template-columns: 1fr !important; }
                    }
                `}</style>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>My Beat The Spread History</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Your weekly submitted team picks displayed side-by-side across both assigned teams.
                    </p>
                </div>

                {userEntries.length > 1 && (
                    <div style={{
                        display: "flex", justifyContent: "center", gap: 8, marginBottom: 24, flexWrap: "wrap"
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
                                        padding: "8px 14px", borderRadius: 8, border: `2px solid ${NFL_BLUE}`,
                                        background: isSelected ? NFL_BLUE : "white", color: isSelected ? "white" : NFL_BLUE,
                                        fontWeight: 700, cursor: "pointer", fontSize: "13px"
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {weeksData.length === 0 ? (
                    <div style={{
                        background: "white", borderRadius: 12, padding: "40px", textAlign: "center",
                        color: "#64748b", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0"
                    }}>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>You haven't made any Beat The Spread picks for Room {selectedRoomId} yet!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {weeksData.map(({ week, team1, team2 }) => (
                            <div key={week} style={{
                                background: "white", borderRadius: 14,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0", overflow: "hidden"
                            }}>
                                <div style={{
                                    background: NFL_BLUE, color: "white", padding: "12px 20px",
                                    display: "flex", justifyContent: "space-between", alignItems: "center"
                                }}>
                                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px" }}>
                                        WEEK {week} <span style={{ fontSize: "12px", fontWeight: 500, opacity: 0.8 }}>(Room {selectedRoomId})</span>
                                    </h3>
                                    <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                                        Side-by-Side View
                                    </span>
                                </div>

                                <div className="bts-history-grid" style={{
                                    padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#f8fafc"
                                }}>
                                    <div>{renderHistoryCard(team1)}</div>
                                    <div>{renderHistoryCard(team2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PoolGatekeeper>
    );
}