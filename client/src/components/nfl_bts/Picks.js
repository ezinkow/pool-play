import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../PoolGatekeeper";

const FALLBACK_BLUE = "#013369";
const GOLD = "#c89d3c";
const NFL_BLUE = "#013369";

export default function NflBtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [assignedTeam, setAssignedTeam] = useState('TBD');
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matchup, setMatchup] = useState(null);
    const [pick, setPick] = useState({ ats_pick: "", ou_pick: "" });
    const [loading, setLoading] = useState(true);
    const [teamMeta, setTeamMeta] = useState({ logo: null, primary_color: "", secondary_color: "" });
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 1. Fetch user entries to see which rooms they belong to
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        axios.get("/api/nfl_bts/entries/me", config)
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

    // 2. Fetch assignment, matchup, and picks for the selected room & week
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        async function fetchData() {
            setLoading(true);
            try {
                const assignmentRes = await axios.get("/api/nfl_bts/assignment", {
                    ...config,
                    params: { room_id: selectedRoomId }
                });
                const teamName = assignmentRes.data.team_name;
                setAssignedTeam(teamName);
                setTeamMeta({
                    logo: assignmentRes.data.logo || null,
                    primary_color: assignmentRes.data.primary_color || FALLBACK_BLUE,
                    secondary_color: assignmentRes.data.secondary_color || GOLD
                });

                if (teamName) {
                    const matchupRes = await axios.get("/api/nfl_regular_season_games", {
                        ...config,
                        params: { week: currentWeek, team: teamName }
                    });
                    setMatchup(matchupRes.data);
                } else {
                    setMatchup(null);
                }

                const pickRes = await axios.get("/api/nfl_bts/picks", {
                    ...config,
                    params: { week: currentWeek, room_id: selectedRoomId }
                });
                if (pickRes.data) {
                    setPick({
                        ats_pick: pickRes.data.ats_pick || "",
                        ou_pick: pickRes.data.ou_pick || ""
                    });
                } else {
                    setPick({ ats_pick: "", ou_pick: "" });
                }
            } catch (err) {
                console.error("Error loading nflbts pick data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, currentWeek, selectedRoomId]);

    const isKickoffPassed = useMemo(() => {
        if (!matchup?.game_date) return false;
        return new Date() >= new Date(matchup.game_date);
    }, [matchup]);

    const spreadInfo = useMemo(() => {
        if (!matchup) return null;
        const absSpread = Math.abs(matchup.adjusted_spread ?? matchup.spread ?? 3.0);
        const favoriteTeam = matchup.favorite || matchup.home_team;

        let favoriteLogo = null;
        if (favoriteTeam === matchup.home_team) {
            favoriteLogo = matchup.home_logo;
        } else if (favoriteTeam === matchup.away_team) {
            favoriteLogo = matchup.away_logo;
        }

        return {
            favoriteTeam,
            favoriteLogo,
            absSpread,
            awaySpread: matchup.away_team === favoriteTeam ? `-${absSpread}` : `+${absSpread}`,
            homeSpread: matchup.home_team === favoriteTeam ? `-${absSpread}` : `+${absSpread}`
        };
    }, [matchup]);

    const handlePickChange = (field, value) => {
        if (isKickoffPassed) {
            toast.error("This game has already kicked off. Picks are locked!");
            return;
        }
        setPick(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (isKickoffPassed) return toast.error("Kickoff has passed. Cannot submit changes.");
        if (!assignedTeam) return toast.error("No assigned team found for this room yet.");

        const token = localStorage.getItem("token");
        try {
            await axios.post("/api/nfl_bts/picks", {
                name: user.name,
                week: currentWeek,
                room_id: selectedRoomId,
                team_name: assignedTeam,
                ats_pick: pick.ats_pick,
                ou_pick: pick.ou_pick
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success(`Room ${selectedRoomId} weekly pick saved successfully!`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save pick");
        }
    };

    if (authLoading || (loading && !assignedTeam)) return <div style={{ textAlign: "center", padding: 50 }}>Loading your team assignment...</div>;

    const awayColor = matchup?.away_color || "#333333";
    const homeColor = matchup?.home_color || FALLBACK_BLUE;

    const leftBannerColor = teamMeta.primary_color || FALLBACK_BLUE;
    const rightBannerColor = teamMeta.secondary_color || GOLD;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{
                display: "grid",
                gridTemplateColumns: "10px 1fr 10px",
                width: "100%",
                maxWidth: "832px",
                margin: "10px auto 90px auto",
                background: "white",
                borderRadius: "14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                overflow: "hidden",
                boxSizing: "border-box"
            }}>
                <div style={{ backgroundColor: leftBannerColor, width: "100%", height: "100%" }} />

                <div style={{ padding: "16px 8px", minWidth: 0, overflow: "hidden" }}>
                    <Toaster />

                    {/* Room Selector Tab Bar (Only shown if user joined multiple rooms) */}
                    {userEntries.length > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
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
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: `2px solid ${NFL_BLUE}`,
                                            background: isSelected ? NFL_BLUE : "white",
                                            color: isSelected ? "white" : NFL_BLUE,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div style={{
                        background: `linear-gradient(135deg, ${teamMeta.primary_color} 0%, ${teamMeta.secondary_color} 100%)`,
                        padding: "16px 12px",
                        borderRadius: 12,
                        border: `2px solid ${teamMeta.secondary_color}`,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        marginBottom: 16,
                        textAlign: "center",
                        color: "white"
                    }}>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <h2 style={{ fontSize: "16px", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                                Room {selectedRoomId} Assignment:
                            </h2>
                            {teamMeta.logo ? (
                                <img src={teamMeta.logo} alt={assignedTeam} style={{ width: isMobile ? 44 : 38, height: isMobile ? 44 : 38, objectFit: "contain", filter: "drop-shadow(0 2px 10px rgb(0, 0, 0))" }} />
                            ) : (
                                <span style={{ fontSize: "14px", fontWeight: 700, background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.5px" }}>
                                    TBD
                                </span>
                            )}
                            {!isMobile && (
                                <div style={{ fontSize: "16px", fontWeight: 800, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                                    {assignedTeam || "Waiting for team assignment..."}
                                </div>
                            )}
                        </div>
                    </div>

                    <h3 style={{ color: NFL_BLUE, fontSize: "14px", margin: "0 0 6px 0" }}>Select Week:</h3>

                    <div style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 16,
                        flexWrap: "nowrap",
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        marginTop: 4,
                        paddingBottom: 6,
                        width: "100%"
                    }}>
                        {[...Array(18)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentWeek(i + 1)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #ddd",
                                    backgroundColor: currentWeek === i + 1 ? FALLBACK_BLUE : "white",
                                    color: currentWeek === i + 1 ? "white" : "#333",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    fontSize: "14px"
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    {matchup ? (
                        <div style={{
                            background: "white",
                            borderRadius: 12,
                            boxShadow: "0 4px 15px rgba(0,0,0,0.10)",
                            overflow: "hidden",
                            border: `2px solid ${homeColor}`
                        }}>
                            <div style={{
                                background: `linear-gradient(135deg, ${awayColor} 0%, ${awayColor} 48%, ${homeColor} 52%, ${homeColor} 100%)`,
                                padding: "12px 14px",
                                color: "white",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                                    {matchup.away_logo && <img src={matchup.away_logo} alt={matchup.away_team} style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
                                    <span style={{ fontSize: 13, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{matchup.away_team}</span>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 20, flexShrink: 0, margin: "0 4px" }}>@</span>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row-reverse", minWidth: 0, flex: 1, textAlign: "right" }}>
                                    {matchup.home_logo && <img src={matchup.home_logo} alt={matchup.home_team} style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0 }} />}
                                    <span style={{ fontSize: 13, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{matchup.home_team}</span>
                                </div>
                            </div>

                            <div style={{ padding: "14px 12px 28px 12px" }}>
                                <h3 style={{ marginTop: 0, fontSize: "15px", color: FALLBACK_BLUE }}>Week {currentWeek} Matchup</h3>
                                <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700, marginBottom: 10 }}>
                                    Kickoff: {new Date(matchup.game_date).toLocaleDateString()} at {new Date(matchup.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 600, background: "#f8fafc", padding: "8px 10px", borderRadius: 8, marginBottom: 14 }}>
                                    <span>Favorite:</span>
                                    {spreadInfo?.favoriteLogo && <img src={spreadInfo.favoriteLogo} alt={spreadInfo.favoriteTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />}
                                    <strong style={{ color: "#1e293b" }}>{spreadInfo?.favoriteTeam}</strong> (-{spreadInfo?.absSpread})
                                </div>

                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: "block", fontWeight: 700, fontSize: "12px", marginBottom: 6, color: "#374151" }}>Against The Spread (ATS) Pick:</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {[
                                            { team: matchup.away_team, logo: matchup.away_logo, spread: spreadInfo?.awaySpread, color: awayColor },
                                            { team: matchup.home_team, logo: matchup.home_logo, spread: spreadInfo?.homeSpread, color: homeColor }
                                        ].map(item => {
                                            const isSelected = pick.ats_pick === item.team;
                                            return (
                                                <button
                                                    key={item.team}
                                                    onClick={() => handlePickChange('ats_pick', item.team)}
                                                    style={{
                                                        flex: 1, padding: "10px 4px", borderRadius: 8, minWidth: 0,
                                                        border: isSelected ? `2px solid ${item.color}` : "1px solid #cbd5e1",
                                                        backgroundColor: isSelected ? "#f8fafc" : "white",
                                                        cursor: isKickoffPassed ? "not-allowed" : "pointer",
                                                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                                                        boxShadow: isSelected ? `0 4px 12px ${item.color}33` : "none",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                    disabled={isKickoffPassed}
                                                >
                                                    {item.logo && <img src={item.logo} alt={item.team} style={{ width: 22, height: 22, objectFit: "contain" }} />}
                                                    <span style={{ fontWeight: 700, fontSize: 12, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{item.team}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 800, color: item.spread.startsWith("-") ? "#b91c1c" : "#15803d" }}>
                                                        ({item.spread})
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: "block", fontWeight: 700, fontSize: "12px", marginBottom: 6, color: "#374151" }}>Over / Under Total ({matchup.over_under}) - Tiebreaker:</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {['Over', 'Under'].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => handlePickChange('ou_pick', val)}
                                                style={{
                                                    flex: 1, padding: "10px 6px", borderRadius: 8,
                                                    border: pick.ou_pick === val ? `2px solid ${FALLBACK_BLUE}` : "1px solid #cbd5e1",
                                                    backgroundColor: pick.ou_pick === val ? "#eff6ff" : "white",
                                                    cursor: isKickoffPassed ? "not-allowed" : "pointer",
                                                    fontWeight: 700, fontSize: 13
                                                }}
                                                disabled={isKickoffPassed}
                                            >
                                                {val} {val === 'Over' ? '⬆️' : '⬇️'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "10px" }}>
                                    {!isKickoffPassed ? (
                                        <button
                                            onClick={handleSubmit}
                                            style={{ width: "100%", padding: 12, backgroundColor: "#16a34a", color: "white", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 10px rgba(22,163,74,0.3)" }}
                                        >
                                            Submit Week {currentWeek} Pick (Room {selectedRoomId})
                                        </button>
                                    ) : (
                                        <div style={{ textAlign: "center", color: "#D50A0A", fontWeight: 700, padding: 8, fontSize: "12px" }}>
                                            🔒 Picks for this game are locked.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: 30, background: "white", borderRadius: 12, border: "1px solid #e2e8f0" }}>
                            <h3 style={{ margin: "0 0 6px 0", color: FALLBACK_BLUE, fontSize: "18px" }}>
                                Team Assignment Pending
                            </h3>
                            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
                                Once teams are assigned to Room {selectedRoomId}, matchups will appear here.
                            </p>
                        </div>
                    )}
                </div>

                <div style={{ backgroundColor: rightBannerColor, width: "100%", height: "100%" }} />
            </div>
        </PoolGatekeeper>
    );
}