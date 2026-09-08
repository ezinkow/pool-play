import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const FALLBACK_BLUE = "#013369";
const GOLD = "#c89d3c";
const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";

export default function NflBtsPicks() {
    const { user, loading: authLoading } = useAuth();
    const [userEntries, setUserEntries] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(1);
    const [assignedTeams, setAssignedTeams] = useState({ team_1: null, team_2: null });
    const [currentWeek, setCurrentWeek] = useState(1);
    const [matchups, setMatchups] = useState({ match_1: null, match_2: null });
    const [picks, setPicks] = useState({
        team_1: { ats_pick: "", ou_pick: "" },
        team_2: { ats_pick: "", ou_pick: "" }
    });
    const [loading, setLoading] = useState(true);
    const [teamsMeta, setTeamsMeta] = useState({
        team_1: { logo: null, primary_color: FALLBACK_BLUE, secondary_color: GOLD },
        team_2: { logo: null, primary_color: FALLBACK_BLUE, secondary_color: GOLD }
    });
    const [teamColorsMap, setTeamColorsMap] = useState({});

    const logoStyle = {
        objectFit: "contain",
        border: "1px solid rgba(255,255,255,0.4)",
        boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
    };

    const darkLogoStyle = {
        objectFit: "contain",
        border: "1px solid rgba(0,0,0,0.15)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.15)"
    };

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

                const t1 = assignmentRes.data.team_name_1;
                const t2 = assignmentRes.data.team_name_2;
                setAssignedTeams({ team_1: t1, team_2: t2 });

                setTeamsMeta({
                    team_1: {
                        logo: assignmentRes.data.logo_1 || null,
                        primary_color: assignmentRes.data.primary_color_1 || FALLBACK_BLUE,
                        secondary_color: assignmentRes.data.secondary_color_1 || GOLD
                    },
                    team_2: {
                        logo: assignmentRes.data.logo_2 || null,
                        primary_color: assignmentRes.data.primary_color_2 || FALLBACK_BLUE,
                        secondary_color: assignmentRes.data.secondary_color_2 || GOLD
                    }
                });

                let m1 = null, m2 = null;
                if (t1) {
                    const matchRes1 = await axios.get("/api/nfl_regular_season_games", { ...config, params: { week: currentWeek, team: t1 } });
                    m1 = matchRes1.data;
                }
                if (t2) {
                    const matchRes2 = await axios.get("/api/nfl_regular_season_games", { ...config, params: { week: currentWeek, team: t2 } });
                    m2 = matchRes2.data;
                }
                setMatchups({ match_1: m1, match_2: m2 });

                const pickRes = await axios.get("/api/nfl_bts/picks", {
                    ...config,
                    params: { week: currentWeek, room_id: selectedRoomId }
                });

                const savedPicks = pickRes.data || [];
                const pMap1 = { ats_pick: "", ou_pick: "" };
                const pMap2 = { ats_pick: "", ou_pick: "" };

                savedPicks.forEach(p => {
                    if (p.team_name === t1) {
                        pMap1.ats_pick = p.ats_pick || "";
                        pMap1.ou_pick = p.ou_pick || "";
                    } else if (p.team_name === t2) {
                        pMap2.ats_pick = p.ats_pick || "";
                        pMap2.ou_pick = p.ou_pick || "";
                    }
                });

                setPicks({ team_1: pMap1, team_2: pMap2 });
            } catch (err) {
                console.error("Error loading nflbts pick data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, currentWeek, selectedRoomId]);

    const handlePickChange = (teamKey, field, value, matchup) => {
        if (matchup?.game_date && new Date() >= new Date(matchup.game_date)) {
            toast.error("This game has already kicked off. Picks are locked!");
            return;
        }
        setPicks(prev => ({
            ...prev,
            [teamKey]: { ...prev[teamKey], [field]: value }
        }));
    };

    const handleSubmitAll = async () => {
        const token = localStorage.getItem("token");
        const picksArray = [];

        if (assignedTeams.team_1 && matchups.match_1) {
            if (new Date() >= new Date(matchups.match_1.game_date)) {
                return toast.error(`Game for ${assignedTeams.team_1} has already kicked off.`);
            }
            picksArray.push({
                team_name: assignedTeams.team_1,
                ats_pick: picks.team_1.ats_pick,
                ou_pick: picks.team_1.ou_pick
            });
        }

        if (assignedTeams.team_2 && matchups.match_2) {
            if (new Date() >= new Date(matchups.match_2.game_date)) {
                return toast.error(`Game for ${assignedTeams.team_2} has already kicked off.`);
            }
            picksArray.push({
                team_name: assignedTeams.team_2,
                ats_pick: picks.team_2.ats_pick,
                ou_pick: picks.team_2.ou_pick
            });
        }

        if (picksArray.length === 0) {
            return toast.error("No active team games to submit picks for this week.");
        }

        try {
            await axios.post("/api/nfl_bts/picks", {
                week: currentWeek,
                room_id: selectedRoomId,
                picks: picksArray
            }, { headers: { Authorization: `Bearer ${token}` } });

            toast.success(`Room ${selectedRoomId} weekly picks saved successfully!`);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save picks");
        }
    };

    if (authLoading || (loading && !assignedTeams.team_1)) return <div style={{ textAlign: "center", padding: 50 }}>Loading your team assignments...</div>;

    const renderMatchupCard = (teamKey, teamName, teamMetaInfo, matchupData, pickData) => {
        if (!teamName) {
            return (
                <div style={{ textAlign: "center", padding: 30, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", height: "100%" }}>
                    <h3 style={{ margin: "0 0 6px 0", color: FALLBACK_BLUE, fontSize: "16px" }}>Team Assignment Pending</h3>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Waiting for random team assignment...</p>
                </div>
            );
        }

        if (!matchupData) {
            return (
                <div style={{ textAlign: "center", padding: 24, background: "white", borderRadius: 12, border: "1px solid #e2e8f0", height: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                        {teamMetaInfo.logo && <img src={teamMetaInfo.logo} alt={teamName} style={{ width: 24, height: 24, ...darkLogoStyle }} />}
                        <h4 style={{ margin: 0, color: FALLBACK_BLUE, fontSize: "15px" }}>{teamName}</h4>
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Bye week or matchup not scheduled for Week {currentWeek}.</p>
                </div>
            );
        }

        const isKickoffPassed = matchupData.game_date && new Date() >= new Date(matchupData.game_date);
        const rawSpread = matchupData.adjusted_spread !== null && matchupData.adjusted_spread !== undefined ? matchupData.adjusted_spread : matchupData.spread;
        const hasLine = rawSpread !== null && rawSpread !== undefined;
        const absSpread = hasLine ? (Object.is(Math.abs(rawSpread), -0) ? 0 : Math.abs(rawSpread)) : 3.0;
        const isAwayFav = hasLine && matchupData.favorite === matchupData.away_team;

        const awaySpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `-${absSpread}` : `+${absSpread}`)) : "+3.0";
        const homeSpreadStr = hasLine ? (absSpread === 0 ? "0" : (isAwayFav ? `+${absSpread}` : `-${absSpread}`)) : "-3.0";

        const awayTeamMeta = teamColorsMap[matchupData.away_team] || {};
        const homeTeamMeta = teamColorsMap[matchupData.home_team] || {};

        const awayLogo = matchupData.away_logo || awayTeamMeta.logo || null;
        const homeLogo = matchupData.home_logo || homeTeamMeta.logo || null;

        const awayColor = matchupData.away_color || awayTeamMeta.color || "#333333";
        const awaySecondary = matchupData.away_secondary_color || awayTeamMeta.secondaryColor || "#cbd5e1";

        const homeColor = matchupData.home_color || homeTeamMeta.color || FALLBACK_BLUE;
        const homeSecondary = matchupData.home_secondary_color || homeTeamMeta.secondaryColor || "#cbd5e1";

        const favoriteTeam = matchupData.favorite;
        const favTeamMeta = teamColorsMap[favoriteTeam] || {};
        const favoriteLogo = favTeamMeta.logo || (favoriteTeam === matchupData.away_team ? awayLogo : (favoriteTeam === matchupData.home_team ? homeLogo : matchupData.favorite_logo)) || null;

        const isAwayPicked = pickData.ats_pick === matchupData.away_team;
        const isHomePicked = pickData.ats_pick === matchupData.home_team;
        const ouPick = pickData.ou_pick;

        return (
            <div style={{
                background: "white",
                borderRadius: 12,
                boxShadow: "0 4px 15px rgba(0,0,0,0.10)",
                overflow: "hidden",
                border: `2px solid ${teamMetaInfo.primary_color || FALLBACK_BLUE}`,
                display: "flex",
                flexDirection: "column",
                height: "100%"
            }}>
                <div style={{
                    background: `linear-gradient(135deg, ${teamMetaInfo.primary_color} 0%, ${teamMetaInfo.secondary_color} 100%)`,
                    padding: "10px 14px",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    gap: 10
                }}>
                    {teamMetaInfo.logo && <img src={teamMetaInfo.logo} alt={teamName} style={{ width: 28, height: 28, ...logoStyle }} />}
                    <span style={{ fontSize: "15px", fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>Assigned: {teamName}</span>
                </div>

                <div style={{
                    background: `linear-gradient(135deg, ${awayColor} 0%, ${awayColor} 48%, ${homeColor} 52%, ${homeColor} 100%)`,
                    padding: "10px 14px",
                    color: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        {matchupData.away_logo && <img src={matchupData.away_logo} alt={matchupData.away_team} style={{ width: 22, height: 22, ...logoStyle, flexShrink: 0 }} />}
                        <span style={{ fontSize: 12, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{matchupData.away_team}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 20, flexShrink: 0, margin: "0 4px" }}>@</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: "row-reverse", minWidth: 0, flex: 1, textAlign: "right" }}>
                        {matchupData.home_logo && <img src={matchupData.home_logo} alt={matchupData.home_team} style={{ width: 22, height: 22, ...logoStyle, flexShrink: 0 }} />}
                        <span style={{ fontSize: 12, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{matchupData.home_team}</span>
                    </div>
                </div>

                <div style={{ padding: "14px 12px 20px 12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: "#d97706", fontWeight: 700 }}>
                                Kickoff: {matchupData.game_date ? `${new Date(matchupData.game_date).toLocaleDateString()} at ${new Date(matchupData.game_date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : "TBD"}
                            </div>
                            {isKickoffPassed && <span style={{ fontSize: "10px", color: NFL_RED, fontWeight: 700 }}>🔒 Locked</span>}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", fontWeight: 600, background: "#f8fafc", padding: "6px 8px", borderRadius: 8, marginBottom: 12, border: "1px solid #e2e8f0" }}>
                            <span>Spread:</span>
                            {favoriteLogo && (
                                <span style={{
                                    background: favTeamMeta.secondaryColor || homeSecondary,
                                    borderRadius: 3,
                                    padding: "1px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: `1px solid ${favTeamMeta.color || homeColor}`,
                                    width: 15,
                                    height: 15,
                                    flexShrink: 0
                                }}>
                                    <img src={favoriteLogo} alt={favoriteTeam || "Favorite"} style={{ width: 10, height: 10, ...darkLogoStyle, display: "block" }} />
                                </span>
                            )}
                            <strong style={{ color: "#1e293b" }}>{rawSpread}</strong> | O/U: <strong>{matchupData.over_under}</strong>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontWeight: 700, fontSize: "11px", marginBottom: 4, color: "#374151" }}>ATS Pick:</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                {[
                                    { team: matchupData.away_team, logo: awayLogo, spread: awaySpreadStr, color: awayColor, secondary: awaySecondary, isPicked: isAwayPicked },
                                    { team: matchupData.home_team, logo: homeLogo, spread: homeSpreadStr, color: homeColor, secondary: homeSecondary, isPicked: isHomePicked }
                                ].map(item => (
                                    <div
                                        key={item.team}
                                        onClick={() => !isKickoffPassed && handlePickChange(teamKey, 'ats_pick', item.team, matchupData)}
                                        style={{
                                            backgroundImage: item.isPicked
                                                ? `linear-gradient(to right, ${item.color} 100%, ${item.color} 100%)`
                                                : `linear-gradient(to right, ${item.color} 0%, ${item.color} 0%, transparent 0%), linear-gradient(135deg, ${item.color}26 0%, ${item.secondary}26 50%, #f8fafc 100%)`,
                                            backgroundColor: item.isPicked ? item.color : "transparent",
                                            borderRadius: 6,
                                            border: item.isPicked ? `2px solid #0284c7` : `1px solid ${item.color}55`,
                                            padding: "8px 6px",
                                            cursor: isKickoffPassed ? "not-allowed" : "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                            position: "relative",
                                            boxShadow: item.isPicked ? `0 0 10px rgba(2, 132, 199, 0.35), inset 0 0 8px ${item.color}` : "none",
                                            transition: "background-size 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1), border 0.2s ease",
                                            backgroundSize: item.isPicked ? "100% 100%" : "0% 100%, 100% 100%",
                                            backgroundRepeat: "no-repeat",
                                            minWidth: 0
                                        }}
                                    >
                                        {item.isPicked && (
                                            <span style={{ position: "absolute", top: 4, right: 6, fontSize: "10px", color: "#ffffff", fontWeight: 900 }}>✓</span>
                                        )}
                                        {item.logo && (
                                            <div style={{
                                                background: item.secondary,
                                                borderRadius: 6,
                                                padding: "3px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                boxShadow: `0 0 4px 1px ${item.color}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                border: `1.5px solid ${item.color}`,
                                                marginBottom: 4,
                                                width: 35,
                                                height: 35,
                                                flexShrink: 0
                                            }}>
                                                <img src={item.logo} alt={item.team} style={{ width: 25, height: 25, objectFit: "contain", display: "block" }} />
                                            </div>
                                        )}
                                        <div style={{ fontWeight: item.isPicked ? 800 : 600, fontSize: "12px", color: item.isPicked ? "#ffffff" : "#0f172a", marginBottom: 2, lineHeight: 1.1, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {item.team}
                                        </div>
                                        <div style={{ fontSize: "11px", fontWeight: 700, color: item.isPicked ? "#e2e8f0" : "#475569" }}>
                                            {item.spread}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                                    O/U: <strong>{matchupData.over_under}</strong>
                                </span>
                                <div style={{ display: "flex", gap: 4 }}>
                                    {['Over', 'Under'].map(val => {
                                        const isOuSelected = ouPick === val;
                                        return (
                                            <button
                                                key={val}
                                                onClick={() => !isKickoffPassed && handlePickChange(teamKey, 'ou_pick', val, matchupData)}
                                                disabled={isKickoffPassed}
                                                style={{
                                                    background: isOuSelected ? "#0284c7" : "#ffffff",
                                                    color: isOuSelected ? "#ffffff" : "#334155",
                                                    border: isOuSelected ? "1px solid #0284c7" : "1px solid #cbd5e1",
                                                    padding: "3px 10px",
                                                    borderRadius: 4,
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    cursor: isKickoffPassed ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <PoolGatekeeper user={user} gameKey="nfl_bts" className='page-content'>
            <br />
            <div style={{
                width: "100%",
                maxWidth: "1200px",
                margin: "10px auto 90px auto",
                background: "white",
                borderRadius: "14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                overflow: "hidden",
                boxSizing: "border-box",
                borderTop: `10px solid ${FALLBACK_BLUE}`,
                borderBottom: `10px solid ${GOLD}`
            }}>
                <style>{`
                    @media (max-width: 900px) {
                        .bts-picks-grid { grid-template-columns: 1fr !important; }
                    }
                `}</style>

                <div style={{ padding: "20px 24px", minWidth: 0 }}>
                    <Toaster />

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

                    <h3 style={{ color: NFL_BLUE, fontSize: "14px", margin: "0 0 6px 0" }}>Select Week:</h3>

                    <div style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 20,
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

                    <h2 style={{ fontSize: "18px", color: NFL_BLUE, textAlign: "center", marginBottom: 20 }}>
                        Room {selectedRoomId} - Week {currentWeek} Team Matchups
                    </h2>

                    {/* Two-Column Side-by-Side Grid */}
                    <div className="bts-picks-grid" style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 20,
                        alignItems: "stretch"
                    }}>
                        <div>{renderMatchupCard('team_1', assignedTeams.team_1, teamsMeta.team_1, matchups.match_1, picks.team_1)}</div>
                        <div>{renderMatchupCard('team_2', assignedTeams.team_2, teamsMeta.team_2, matchups.match_2, picks.team_2)}</div>
                    </div>

                    <div style={{ marginTop: 24, marginBottom: 10 }}>
                        <button
                            onClick={handleSubmitAll}
                            style={{
                                width: "100%", padding: 14, backgroundColor: "#16a34a", color: "white",
                                borderRadius: 8, border: "none", fontWeight: 700, fontSize: 15,
                                cursor: "pointer", boxShadow: "0 4px 10px rgba(22,163,74,0.3)"
                            }}
                        >
                            Submit Week {currentWeek} Picks for Room {selectedRoomId}
                        </button>
                    </div>
                </div>
            </div>
        </PoolGatekeeper>
    );
}