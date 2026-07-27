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
    const [assignedTeam, setAssignedTeam] = useState(null);
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matchup, setMatchup] = useState(null);
    const [pick, setPick] = useState({ ats_pick: "", ou_pick: "" });
    const [loading, setLoading] = useState(true);
    const [teamMeta, setTeamMeta] = useState({ logo: null, primary_color: "", secondary_color: "" });

    // Fetch user's assigned team and current week's matchup
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem("token");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        async function fetchData() {
            try {
                const token = localStorage.getItem("token");
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // 1. Fetch assignment with auth headers attached
                const assignmentRes = await axios.get("/api/nfl_bts/assignment", config);
                const teamName = assignmentRes.data.team_name;
                setAssignedTeam(teamName);
                setTeamMeta({
                    logo: assignmentRes.data.logo || null,
                    primary_color: assignmentRes.data.primary_color || FALLBACK_BLUE,
                    secondary_color: assignmentRes.data.secondary_color || GOLD
                });

                // 2. Fetch matchup with auth headers attached
                const matchupRes = await axios.get("/api/nfl_bts/matchup", {
                    ...config,
                    params: { week: currentWeek, team: teamName }
                });
                setMatchup(matchupRes.data);

                // 3. Fetch user's existing picks with auth headers attached
                const pickRes = await axios.get("/api/nfl_bts/picks", {
                    ...config,
                    params: { week: currentWeek }
                });
                if (pickRes.data) {
                    setPick({
                        ats_pick: pickRes.data.ats_pick || "",
                        ou_pick: pickRes.data.ou_pick || ""
                    });
                }
            } catch (err) {
                console.error("Error loading nflbts pick data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, currentWeek]);

    // Check if kickoff has passed
    const isKickoffPassed = useMemo(() => {
        if (!matchup?.game_date) return false;
        return new Date() >= new Date(matchup.game_date);
    }, [matchup]);

    // 🧠 SPREAD & FAVORITE LOGIC (Including favoriteLogo mapping)
    const spreadInfo = useMemo(() => {
        if (!matchup) return null;
        const absSpread = Math.abs(matchup.adjusted_spread ?? matchup.spread ?? 3.0);
        const favoriteTeam = matchup.favorite || matchup.home_team;

        // Determine favorite logo dynamically
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

        const token = localStorage.getItem("token");
        try {
            await axios.post("/api/nfl_bts/picks", {
                name: user.name,
                week: currentWeek,
                team_name: assignedTeam,
                ats_pick: pick.ats_pick,
                ou_pick: pick.ou_pick
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success("Weekly pick saved successfully!");
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save pick");
        }
    };

    if (authLoading || loading) return <div style={{ textAlign: "center", padding: 50 }}>Loading your team assignment...</div>;

    // Strict team color mappings
    const awayColor = matchup?.away_color || "#333333";
    const homeColor = matchup?.home_color || FALLBACK_BLUE;

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts">
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>
                <Toaster />

                {/* Header Banner */}
                <div style={{
                    background: `linear-gradient(135deg, ${teamMeta.primary_color} 0%, ${teamMeta.secondary_color} 100%)`,
                    padding: 24,
                    borderRadius: 12,
                    border: `2px solid ${teamMeta.secondary_color}`,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    marginBottom: 20,
                    textAlign: "center",
                    color: "white"
                }}>
                    <h2 style={{ margin: "0 0 12px 0", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>Season Team Assignment</h2>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
                        {teamMeta.logo && (
                            <img src={teamMeta.logo} alt={assignedTeam} style={{ width: 52, height: 52, objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }} />
                        )}
                        <div style={{ fontSize: "22px", fontWeight: 800, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                            {assignedTeam ? assignedTeam : "Waiting for 32-player room assignment..."}
                        </div>
                    </div>
                </div>
                <h3 style={{ color: NFL_BLUE, fontSize: "15px", margin: 0 }}>Select Week:</h3>
                {/* Week Selector Tabs */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                    {[...Array(18)].map((_, i) => (
                        <button
                            key={i + 1}
                            onClick={() => setCurrentWeek(i + 1)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === i + 1 ? FALLBACK_BLUE : "white",
                                color: currentWeek === i + 1 ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600
                            }}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>

                {/* Matchup & Pick Card */}
                {matchup ? (
                    <div style={{
                        background: "white",
                        borderRadius: 12,
                        boxShadow: "0 4px 15px rgba(0,0,0,0.10)",
                        overflow: "hidden",
                        border: `2px solid ${homeColor}`
                    }}>
                        {/* 🎨 Dedicated Split Team Colors (Away on left, Home on right) */}
                        <div style={{
                            background: `linear-gradient(135deg, ${awayColor} 0%, ${awayColor} 48%, ${homeColor} 52%, ${homeColor} 100%)`,
                            padding: "16px 24px",
                            color: "white",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {matchup.away_logo && <img src={matchup.away_logo} alt={matchup.away_team} style={{ width: 36, height: 36, objectFit: "contain" }} />}
                                <span style={{ fontSize: 18, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{matchup.away_team}</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, background: "rgba(0,0,0,0.4)", padding: "4px 10px", borderRadius: 20 }}>@</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: "row-reverse" }}>
                                {matchup.home_logo && <img src={matchup.home_logo} alt={matchup.home_team} style={{ width: 36, height: 36, objectFit: "contain" }} />}
                                <span style={{ fontSize: 18, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{matchup.home_team}</span>
                            </div>
                        </div>

                        <div style={{ padding: 24 }}>
                            <h3 style={{ marginTop: 0, color: FALLBACK_BLUE }}>Week {currentWeek} Matchup</h3>
                            <div style={{ fontSize: 13, color: "#d97706", fontWeight: 700, marginBottom: 16 }}>
                                Kickoff: {new Date(matchup.game_date).toLocaleString()}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "14px", fontWeight: 600, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, marginBottom: 20 }}>
                                <span>Favorite:</span>
                                {spreadInfo?.favoriteLogo && <img src={spreadInfo.favoriteLogo} alt={spreadInfo.favoriteTeam} style={{ width: 22, height: 22, objectFit: "contain" }} />}
                                <strong style={{ color: "#1e293b" }}>{spreadInfo?.favoriteTeam}</strong> (-{spreadInfo?.absSpread})
                            </div>

                            {/* ATS Selection Buttons */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: "block", fontWeight: 700, marginBottom: 8, color: "#374151" }}>Against The Spread (ATS) Pick:</label>
                                <div style={{ display: "flex", gap: 12 }}>
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
                                                    flex: 1, padding: "14px 10px", borderRadius: 8,
                                                    border: isSelected ? `2px solid ${item.color}` : "1px solid #cbd5e1",
                                                    backgroundColor: isSelected ? "#f8fafc" : "white",
                                                    cursor: isKickoffPassed ? "not-allowed" : "pointer",
                                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                                                    boxShadow: isSelected ? `0 4px 12px ${item.color}33` : "none",
                                                    transition: "all 0.2s ease"
                                                }}
                                                disabled={isKickoffPassed}
                                            >
                                                {item.logo && <img src={item.logo} alt={item.team} style={{ width: 28, height: 28, objectFit: "contain" }} />}
                                                <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{item.team}</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: item.spread.startsWith("-") ? "#b91c1c" : "#15803d" }}>
                                                    ({item.spread})
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Over/Under Selection */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", fontWeight: 700, marginBottom: 8, color: "#374151" }}>Over / Under Total ({matchup.over_under}) - Tiebreaker:</label>
                                <div style={{ display: "flex", gap: 12 }}>
                                    {['Over', 'Under'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => handlePickChange('ou_pick', val)}
                                            style={{
                                                flex: 1, padding: 12, borderRadius: 8,
                                                border: pick.ou_pick === val ? `2px solid ${FALLBACK_BLUE}` : "1px solid #cbd5e1",
                                                backgroundColor: pick.ou_pick === val ? "#eff6ff" : "white",
                                                cursor: isKickoffPassed ? "not-allowed" : "pointer",
                                                fontWeight: 700, fontSize: 15
                                            }}
                                            disabled={isKickoffPassed}
                                        >
                                            {val} {val === 'Over' ? '⬆️' : '⬇️'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isKickoffPassed ? (
                                <button
                                    onClick={handleSubmit}
                                    style={{ width: "100%", padding: 14, backgroundColor: "#16a34a", color: "white", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer", boxShadow: "0 4px 10px rgba(22,163,74,0.3)" }}
                                >
                                    Submit Week {currentWeek} Pick
                                </button>
                            ) : (
                                <div style={{ textAlign: "center", color: "#D50A0A", fontWeight: 700, padding: 10 }}>
                                    🔒 Picks for this game are locked.
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 12 }}>
                        <p>No active matchup found for your assigned team this week.</p>
                    </div>
                )}
            </div>
        </PoolGatekeeper>
    );
}