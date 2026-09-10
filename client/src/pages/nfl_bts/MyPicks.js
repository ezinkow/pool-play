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
                    axios.get("/api/nfl_bts/games", {
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
                const gamesData = matchupRes.data;
                const gamesList = Array.isArray(gamesData)
                    ? gamesData
                    : (gamesData?.games && Array.isArray(gamesData.games) ? gamesData.games : [gamesData].filter(Boolean));
                const assignment = assignmentRes.data;

                if (picksList.length === 0 || !picksList.some(p => p.ats_pick || p.ou_pick)) {
                    return null;
                }

                const team1Name = assignment?.team_name_1 || null;
                const team2Name = assignment?.team_name_2 || null;

                const pick1 = picksList.find(p => p.team_name === team1Name) || null;
                const pick2 = picksList.find(p => p.team_name === team2Name) || null;

                const getGameForPick = (pickItem, assignedName) => {
                    if (!gamesList || gamesList.length === 0) return null;

                    if (pickItem?.game_id) {
                        const foundById = gamesList.find(g =>
                            String(g.id) === String(pickItem.game_id) ||
                            String(g.game_id) === String(pickItem.game_id)
                        );
                        if (foundById) return foundById;
                    }

                    const searchTeam1 = pickItem?.team_name || assignedName;
                    const searchTeam2 = pickItem?.ats_pick;

                    return gamesList.find(g => {
                        const home = g.home_team?.toLowerCase();
                        const away = g.away_team?.toLowerCase();
                        return (
                            (searchTeam1 && (home === searchTeam1.toLowerCase() || away === searchTeam1.toLowerCase())) ||
                            (searchTeam2 && (home === searchTeam2.toLowerCase() || away === searchTeam2.toLowerCase()))
                        );
                    });
                };

                const game1 = getGameForPick(pick1, team1Name);
                const game2 = getGameForPick(pick2, team2Name);

                const evaluateAtsStatus = (pickItem, gameItem) => {
                    if (!pickItem || !gameItem) return pickItem?.ats_status || null;
                    if (pickItem.ats_status) return pickItem.ats_status;
                    if (gameItem.status === 'STATUS_FINAL') {
                        if (pickItem.ats_pick && gameItem.ats_winner) {
                            return pickItem.ats_pick.trim().toLowerCase() === gameItem.ats_winner.trim().toLowerCase() ? 'win' : 'loss';
                        }
                    }
                    return null;
                };

                const evaluateOuStatus = (pickItem, gameItem) => {
                    if (!pickItem || !gameItem) return pickItem?.ou_status || null;
                    if (pickItem.ou_status) return pickItem.ou_status;
                    if (gameItem.status === 'STATUS_FINAL' && gameItem.ou_result) {
                        const pickedOu = pickItem.ou_pick ? pickItem.ou_pick.trim().toLowerCase() : '';
                        const gameOu = gameItem.ou_result.trim().toLowerCase();
                        if (gameOu === 'push') return 'push';
                        if (pickedOu === gameOu) return 'win';
                        return 'loss';
                    }
                    return null;
                };

                const evaluatedPick1 = pick1 ? { ...pick1, ats_status: evaluateAtsStatus(pick1, game1), ou_status: evaluateOuStatus(pick1, game1) } : null;
                const evaluatedPick2 = pick2 ? { ...pick2, ats_status: evaluateAtsStatus(pick2, game2), ou_status: evaluateOuStatus(pick2, game2) } : null;

                return {
                    week,
                    team1: team1Name ? { name: team1Name, pick: evaluatedPick1, game: game1 } : null,
                    team2: team2Name ? { name: team2Name, pick: evaluatedPick2, game: game2 } : null
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

    const renderTeamWithLogo = (teamName, customSize = 14) => {
        if (!teamName) return <span>None</span>;
        const meta = teamColors[teamName] || {};
        const logo = meta.logo;
        const bg = meta.secondaryColor || "#cbd5e1";
        const border = meta.primaryColor || NFL_BLUE;

        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {logo && (
                    <span style={{
                        background: bg,
                        borderRadius: 4,
                        padding: "2px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${border}`,
                        width: customSize + 8,
                        height: customSize + 8,
                        flexShrink: 0
                    }}>
                        <img src={logo} alt={teamName} style={{ width: customSize, height: customSize, objectFit: "contain", display: "block" }} />
                    </span>
                )}
                <strong>{teamName}</strong>
            </span>
        );
    };

    const renderHistoryCard = (slotData) => {
        if (!slotData || !slotData.name || !slotData.pick) {
            return (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px dashed #cbd5e1", textAlign: "center", color: "#64748b", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: "13px", margin: 0 }}>No pick submitted for this slot.</p>
                </div>
            );
        }

        const { name: assignedTeamName, pick, game } = slotData;
        const assignedMeta = teamColors[assignedTeamName] || {};
        const assignedPrimary = assignedMeta.primaryColor || NFL_BLUE;
        const assignedSecondary = assignedMeta.secondaryColor || GOLD;

        const atsPick = pick.ats_pick || "";
        const ouPick = pick.ou_pick || "";

        const pickedTeamMeta = teamColors[atsPick] || assignedMeta;
        const boxPrimary = pickedTeamMeta.primaryColor || assignedPrimary;
        const boxSecondary = pickedTeamMeta.secondaryColor || assignedSecondary;

        let spreadDisplay = "";
        if (game) {
            const targetTeam = (atsPick === game.home_team || atsPick === game.away_team) ? atsPick : assignedTeamName;
            const rawSpread = game.adjusted_spread !== null && game.adjusted_spread !== undefined ? game.adjusted_spread : game.spread;
            const hasLine = rawSpread !== null && rawSpread !== undefined;
            const absSpread = hasLine ? (Object.is(Math.abs(rawSpread), -0) ? 0 : Math.abs(rawSpread)) : null;
            const isAwayFav = hasLine && game.favorite === game.away_team;

            if (absSpread !== null) {
                if (targetTeam === game.away_team) {
                    spreadDisplay = absSpread === 0 ? "0" : (isAwayFav ? `-${absSpread}` : `+${absSpread}`);
                } else if (targetTeam === game.home_team) {
                    spreadDisplay = absSpread === 0 ? "0" : (isAwayFav ? `+${absSpread}` : `-${absSpread}`);
                }
            }
        }

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
                background: "white",
                color: "#0f172a",
                borderRadius: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                height: "100%"
            }}>
                {/* Header banner with clean solid primary team color */}
                <div style={{
                    background: boxPrimary,
                    color: "white",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `3px solid ${boxSecondary}`
                }}>
                    {renderTeamWithLogo(atsPick || assignedTeamName, 14)}

                    {game && (
                        <span style={{
                            background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4, fontSize: "10px", fontWeight: 700, color: "#fff"
                        }}>
                            {game.home_score !== null && game.away_score !== null && (game.home_score > 0 || game.away_score > 0 || game.status === "STATUS_FINAL")
                                ? `${game.status === "STATUS_FINAL" ? "Final" : "Live"} ${game.away_score}-${game.home_score}`
                                : "Upcoming"}
                        </span>
                    )}
                </div>

                {/* Matchup info */}
                {game && (
                    <div style={{
                        background: "#f8fafc", padding: "6px 14px", borderBottom: "1px solid #f1f5f9",
                        fontSize: "11px", color: "#64748b", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            Matchup: {renderTeamWithLogo(game.away_team, 11)} @ {renderTeamWithLogo(game.home_team, 11)}
                        </span>
                        {game.over_under && <span>O/U Line: {game.over_under}</span>}
                    </div>
                )}

                {/* Selections Body */}
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "space-between" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#64748b", display: "block", fontSize: "10px", fontWeight: 700, marginBottom: 2, textTransform: "uppercase" }}>ATS Pick</span>
                            <span style={{ color: NFL_BLUE, fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                {renderTeamWithLogo(atsPick, 12)} {spreadDisplay}
                            </span>
                        </div>
                        <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                            <span style={{ color: "#64748b", display: "block", fontSize: "10px", fontWeight: 700, marginBottom: 2, textTransform: "uppercase" }}>O/U Pick</span>
                            <span style={{ color: NFL_BLUE, fontSize: "12px", fontWeight: 700 }}>
                                {ouPick ? (ouPick === 'Over' ? '⬆️ Over' : '⬇️ Under') : "None"}
                            </span>
                        </div>
                    </div>

                    {/* Results rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 700 }}>
                            <span style={{ color: "#475569", fontSize: "11px" }}>ATS Result:</span>
                            {renderStatusBadge(pick.ats_status)}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: 700 }}>
                            <span style={{ color: "#475569", fontSize: "11px" }}>O/U Result:</span>
                            {renderStatusBadge(pick.ou_status)}
                        </div>
                    </div>
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
                ) : (() => {
                    const firstTeam1 = weeksData.find(w => w.team1)?.team1?.name || "Slot 1";
                    const firstTeam2 = weeksData.find(w => w.team2)?.team2?.name || "Slot 2";

                    const meta1 = teamColors[firstTeam1] || {};
                    const meta2 = teamColors[firstTeam2] || {};

                    const col1Primary = meta1.primaryColor || NFL_BLUE;
                    const col1Secondary = meta1.secondaryColor || GOLD;
                    const col2Primary = meta2.primaryColor || NFL_BLUE;
                    const col2Secondary = meta2.secondaryColor || GOLD;

                    return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div className="bts-history-grid" style={{
                                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16
                            }}>
                                <div style={{
                                    background: col1Primary,
                                    padding: "12px 16px",
                                    color: "white",
                                    borderRadius: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                    borderBottom: `4px solid ${col1Secondary}`
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div>
                                            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9, fontWeight: 700, display: "block" }}>
                                                Assigned Team (Slot 1)
                                            </span>
                                            <span style={{ fontSize: "16px", fontWeight: 800 }}>
                                                {renderTeamWithLogo(firstTeam1, 18)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    background: col2Primary,
                                    padding: "12px 16px",
                                    color: "white",
                                    borderRadius: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                    borderBottom: `4px solid ${col2Secondary}`
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div>
                                            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9, fontWeight: 700, display: "block" }}>
                                                Assigned Team (Slot 2)
                                            </span>
                                            <span style={{ fontSize: "16px", fontWeight: 800 }}>
                                                {renderTeamWithLogo(firstTeam2, 18)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {weeksData.map(({ week, team1, team2 }) => (
                                    <div key={week} style={{
                                        background: "white", borderRadius: 14,
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0", overflow: "hidden"
                                    }}>
                                        <div style={{
                                            background: NFL_BLUE, color: "white", padding: "10px 20px",
                                            display: "flex", justifyContent: "space-between", alignItems: "center"
                                        }}>
                                            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, letterSpacing: "0.5px" }}>
                                                WEEK {week} <span style={{ fontSize: "12px", fontWeight: 500, opacity: 0.8 }}>(Room {selectedRoomId})</span>
                                            </h3>
                                            <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                                                Side-by-Side View
                                            </span>
                                        </div>

                                        <div className="bts-history-grid" style={{
                                            padding: 16, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, background: "#f8fafc", alignItems: "stretch"
                                        }}>
                                            <div>{renderHistoryCard(team1)}</div>
                                            <div style={{ width: "2px", background: "#cbd5e1", margin: "0 4px", borderRadius: 2 }} />
                                            <div>{renderHistoryCard(team2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </PoolGatekeeper>
    );
}