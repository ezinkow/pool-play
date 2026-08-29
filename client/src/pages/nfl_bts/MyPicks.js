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
    const [allPicks, setAllPicks] = useState([]);
    const [teamColors, setTeamColors] = useState({});
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token");

    // Fetch team branding mapping
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

    // Fetch user entries to check room memberships
    useEffect(() => {
        if (!user) return;
        axios.get("/api/nfl_entries/me", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .catch(() => axios.get("/api/nfl_bts/entries/me", { headers: { Authorization: `Bearer ${token}` } }))
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

    // Fetch all 18 weeks of picks, games, and team assignments concurrently for the selected room
    useEffect(() => {
        if (!user) return;
        setLoading(true);

        const weekPromises = [...Array(18)].map(async (_, i) => {
            const week = i + 1;
            try {
                const [pickRes, assignmentRes, matchupRes] = await Promise.all([
                    axios.get("/api/nfl_bts/picks", {
                        params: { week, room_id: selectedRoomId },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: null })),
                    axios.get("/api/nfl_bts/assignment", {
                        params: { week, room_id: selectedRoomId },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: null })),
                    axios.get("/api/nfl_regular_season_games", {
                        params: { week },
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: [] }))
                ]);

                return {
                    week,
                    pick: pickRes.data || {},
                    assignedTeam: assignmentRes.data?.team_name || null,
                    games: Array.isArray(matchupRes.data) ? matchupRes.data : [matchupRes.data].filter(Boolean)
                };
            } catch (err) {
                return null;
            }
        });

        Promise.all(weekPromises)
            .then(results => {
                const picksList = [];

                results.forEach(item => {
                    if (!item) return;
                    const { week, pick, assignedTeam, games } = item;

                    let matchedGame = null;
                    if (assignedTeam) {
                        matchedGame = games.find(
                            g => g.away_team === assignedTeam || g.home_team === assignedTeam
                        );
                    }

                    const atsPick = pick.ats_pick || "";
                    const ouPick = pick.ou_pick || "";

                    if (atsPick || ouPick) {
                        picksList.push({
                            week,
                            assignedTeam,
                            atsPick,
                            ouPick,
                            status: pick.status || null,
                            game: matchedGame || null
                        });
                    }
                });

                setAllPicks(picksList.sort((a, b) => a.week - b.week));
            })
            .catch(err => {
                console.error("Failed to load BTS pick history", err);
                toast.error("Failed to load pick history");
            })
            .finally(() => setLoading(false));
    }, [user, token, selectedRoomId]);

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading your Beat The Spread history...</div>;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts" className='page-content'>
            <div style={{ maxWidth: 850, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>My Beat The Spread History</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        Your submitted team picks, point spread choices, and over/under results.
                    </p>
                </div>

                {/* Room Selector Tab Bar */}
                {userEntries.length > 1 && (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 24,
                        flexWrap: "wrap"
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
                                        fontSize: "13px"
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {allPicks.length === 0 ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        padding: "40px",
                        textAlign: "center",
                        color: "#64748b",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        border: "1px solid #e2e8f0"
                    }}>
                        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>You haven't made any Beat The Spread picks for Room {selectedRoomId} yet!</p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {allPicks.map(({ week, assignedTeam, atsPick, ouPick, status, game }) => {
                            const pickedTeamMeta = teamColors[atsPick] || {};
                            const primaryColor = pickedTeamMeta.primaryColor || NFL_BLUE;
                            const secondaryColor = pickedTeamMeta.secondaryColor || GOLD;
                            const logoBgColor = pickedTeamMeta.logoBg || "rgba(255,255,255,0.2)";

                            let statusBadge = <span style={{ color: "#64748b", fontWeight: 700, fontSize: "12px" }}>⏳ Pending Game</span>;
                            if (status === "win") {
                                statusBadge = <span style={{ color: "#16a34a", fontWeight: 800, fontSize: "12px" }}>✓ WIN</span>;
                            } else if (status === "loss") {
                                statusBadge = <span style={{ color: NFL_RED, fontWeight: 800, fontSize: "12px" }}>✕ LOSS</span>;
                            } else if (status === "push") {
                                statusBadge = <span style={{ color: "#d97706", fontWeight: 800, fontSize: "12px" }}>— PUSH</span>;
                            } else if (game && game.game_date && new Date() >= new Date(game.game_date)) {
                                statusBadge = <span style={{ color: "#0284c7", fontWeight: 700, fontSize: "12px" }}>In Progress / Awaiting Scoring</span>;
                            }

                            // Calculate spread string for display matchup
                            let spreadDisplay = "";
                            if (game) {
                                const absSpread = Math.abs(game.adjusted_spread ?? game.spread ?? 3.0);
                                const favoriteTeam = game.favorite || game.home_team;
                                const isAwayFav = favoriteTeam === game.away_team;
                                
                                if (game.away_team === atsPick) {
                                    spreadDisplay = isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                                } else {
                                    spreadDisplay = !isAwayFav ? `-${absSpread}` : `+${absSpread}`;
                                }
                            }

                            const opponentTeam = game ? (game.away_team === atsPick ? game.home_team : game.away_team) : null;
                            const opponentMeta = teamColors[opponentTeam] || {};

                            return (
                                <div key={week} style={{
                                    background: primaryColor,
                                    color: "#ffffff",
                                    borderRadius: 12,
                                    boxShadow: `0 4px 16px ${primaryColor}33`,
                                    padding: "18px 22px",
                                    border: `2px solid ${secondaryColor}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                                        <div>
                                            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.85, fontWeight: 700 }}>
                                                Week {week} Pick (Room {selectedRoomId})
                                            </span>
                                            <h3 style={{ margin: "2px 0 0 0", fontSize: "20px", fontWeight: 800 }}>
                                                {atsPick ? `ATS Pick: ${atsPick}` : "No ATS Pick"}
                                            </h3>
                                            <div style={{ fontSize: "12px", opacity: 0.9, marginTop: 3, fontWeight: 600 }}>
                                                Assigned Team: {assignedTeam || "None"}
                                            </div>
                                        </div>

                                        {/* Matchup & Logo container positioned where the red boxes indicate */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            {game && opponentTeam && (
                                                <div style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    background: "rgba(0,0,0,0.25)",
                                                    padding: "6px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid rgba(255,255,255,0.15)",
                                                    fontSize: "13px",
                                                    fontWeight: 700
                                                }}>
                                                    {pickedTeamMeta.logo && <img src={pickedTeamMeta.logo} alt={atsPick} style={{ width: 22, height: 22, objectFit: "contain" }} />}
                                                    <span>vs ({spreadDisplay})</span>
                                                    {opponentMeta.logo && <img src={opponentMeta.logo} alt={opponentTeam} style={{ width: 22, height: 22, objectFit: "contain" }} />}
                                                </div>
                                            )}

                                            {pickedTeamMeta.logo && (
                                                <div style={{
                                                    background: logoBgColor,
                                                    padding: "6px 10px",
                                                    borderRadius: 8,
                                                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                                    border: "1px solid rgba(255,255,255,0.2)"
                                                }}>
                                                    <img src={pickedTeamMeta.logo} alt={atsPick} style={{ width: 38, height: 38, objectFit: "contain" }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {game && (
                                        <div style={{
                                            background: "rgba(0, 0, 0, 0.2)",
                                            borderRadius: 8,
                                            padding: "10px 14px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            gap: 8,
                                            fontSize: "13px"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, flexWrap: "wrap" }}>
                                                {pickedTeamMeta.logo && <img src={pickedTeamMeta.logo} alt={atsPick} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                                <span>{atsPick} ({spreadDisplay})</span>
                                                <span style={{ opacity: 0.7, margin: "0 2px" }}>vs</span>
                                                {opponentMeta.logo && <img src={opponentMeta.logo} alt={opponentTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                                <span>{opponentTeam}</span>
                                            </div>

                                            {game.home_score !== null && game.away_score !== null && (game.home_score > 0 || game.away_score > 0 || game.status === "final") ? (
                                                <span style={{ background: "#0f172a", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: "11px", fontWeight: 700 }}>
                                                    {game.status === "final" ? "Final: " : "Live: "} {game.away_score} - {game.home_score}
                                                </span>
                                            ) : (
                                                <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: "11px", fontWeight: 600 }}>
                                                    Kickoff Pending
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div style={{
                                        background: "white",
                                        color: "#0f172a",
                                        padding: "10px 14px",
                                        borderRadius: 8,
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 10,
                                        fontSize: "13px",
                                        fontWeight: 700
                                    }}>
                                            <div>
                                                <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>ATS Selection:</span>
                                                <span style={{ color: NFL_BLUE }}>{atsPick ? `${atsPick} (${spreadDisplay})` : "None"}</span>
                                            </div>
                                            <div>
                                                <span style={{ color: "#64748b", display: "block", fontSize: "11px", fontWeight: 600 }}>O/U Pick:</span>
                                                <span style={{ color: NFL_BLUE }}>{ouPick ? `${ouPick === 'Over' ? '⬆️ Over' : '⬇️ Under'}` : "None"}</span>
                                            </div>
                                    </div>

                                    <div style={{
                                        background: "white",
                                        color: "#0f172a",
                                        padding: "8px 14px",
                                        borderRadius: 6,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontWeight: 700,
                                        fontSize: "13px"
                                    }}>
                                        <span>Status:</span>
                                        {statusBadge}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PoolGatekeeper>
    );
}