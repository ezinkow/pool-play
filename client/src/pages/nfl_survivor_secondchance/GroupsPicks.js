import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import PoolGatekeeper from "../../components/PoolGatekeeper";

const NFL_BLUE = "#013369";
const NFL_RED = "#D50A0A";
//2026 start week for 2nd chance survivor is week 6, so we do not need to view weeks prior to week 6
const START_WEEK = 6;

export default function NflSurvivorGroupPicks() {
    const { user, loading: authLoading } = useAuth();
    const [currentWeek, setCurrentWeek] = useState(START_WEEK);
    const [maxAvailableWeek, setMaxAvailableWeek] = useState(START_WEEK);
    const [rosterData, setRosterData] = useState([]);
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
                        secondaryColor: t.secondary_color || t.alt_color || "#64748b",
                        logo: t.logo
                    };
                });
                setTeamColors(map);
            })
            .catch(err => console.error("Failed to load NFL team colors", err));
    }, [token]);

    // Fetch dynamic current active week from 2nd chance survivor settings, then fetch roster data
    useEffect(() => {
        if (!user || !token) return;
        setLoading(true);

        axios.get("/api/nfl_regular_season/settings", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                const activeWk = res.data?.current_week;
                if (activeWk) {
                    const weekNum = Number(activeWk);
                    // Ensure currentWeek doesn't fall below Week 6
                    const effectiveWeek = Math.max(weekNum, START_WEEK);
                    setCurrentWeek(effectiveWeek);
                    setMaxAvailableWeek(effectiveWeek); 
                } else {
                    setCurrentWeek(START_WEEK);
                    setMaxAvailableWeek(START_WEEK);
                }
            })
            .catch(err => {
                console.error("Failed to load 2nd Chance Survivor settings, defaulting to week 6", err);
                setCurrentWeek(START_WEEK);
                setMaxAvailableWeek(START_WEEK);
            })
            .finally(() => {
                // Fetch roster data from your existing route
                axios.get("/api/nflsurvivor_secondchance/roster", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then(res => {
                        setRosterData(res.data || []);
                    })
                    .catch(err => {
                        console.error("Failed to load 2nd Chance Survivor roster", err);
                        toast.error("Failed to load group matrix");
                    })
                    .finally(() => setLoading(false));
            });
    }, [user, token]);

    const handleWeekChange = (targetWeek) => {
        if (targetWeek < START_WEEK) {
            toast.error("Weeks prior to Week 6 are not part of 2nd Chance Survivor!");
            return;
        }
        if (targetWeek > maxAvailableWeek) {
            toast.error("You cannot view future weeks matrix!");
            return;
        }
        setCurrentWeek(targetWeek);
    };

    if (authLoading || loading || currentWeek === null) return <div style={{ textAlign: "center", padding: 50 }}>Loading group matrix...</div>;

    // Generate weeks array strictly from Week 6 up to maxAvailableWeek
    const weeksList = [];
    for (let w = START_WEEK; w <= maxAvailableWeek; w++) {
        weeksList.push(w);
    }

    return (
        <PoolGatekeeper user={user} gameKey="nfl_survivor_secondchance" >
            <div style={{ maxWidth: 950, margin: "0 auto", padding: "20px 12px", paddingBottom: 90 }}>
                <Toaster />

                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ color: NFL_BLUE, fontSize: "26px", margin: 0 }}>2nd Chance Survivor Group Matrix</h2>
                    <p style={{ color: "#666", marginTop: 6, fontSize: "14px" }}>
                        See what team every participant selected for Week {currentWeek}.
                    </p>
                </div>

                {/* Restricted Week Selector Bar (Shows buttons only from Week 6 up to current week) */}
                <div style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: 6,
                    marginBottom: 20,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    paddingBottom: 6,
                    width: "100%"
                }}>
                    {weeksList.map(weekNum => (
                        <button
                            key={weekNum}
                            onClick={() => handleWeekChange(weekNum)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #ddd",
                                backgroundColor: currentWeek === weekNum ? NFL_BLUE : "white",
                                color: currentWeek === weekNum ? "white" : "#333",
                                cursor: "pointer",
                                fontWeight: 600,
                                flexShrink: 0,
                                fontSize: "14px"
                            }}
                        >
                            Week {weekNum}
                        </button>
                    ))}
                </div>

                {/* Matrix Table */}
                <div style={{
                    background: "white",
                    borderRadius: 12,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    border: "1px solid #e2e8f0",
                    overflowX: "auto"
                }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
                        <thead>
                            <tr style={{ backgroundColor: NFL_BLUE, color: "white" }}>
                                <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "14px" }}>Participant</th>
                                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "14px" }}>Week {currentWeek} Selection</th>
                                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: "14px" }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rosterData.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ textAlign: "center", padding: "40px", color: "#666" }}>
                                        No pool entries found.
                                    </td>
                                </tr>
                            ) : (
                                rosterData.map((row, idx) => {
                                    const isCurrentUser = Number(row.user_id) === Number(user.id);
                                    const weekPickObj = row.picks?.[currentWeek] || null;
                                    const pickedTeam = weekPickObj?.team_name || null;
                                    const isHidden = pickedTeam === "🔒 Hidden";
                                    const teamMeta = teamColors[pickedTeam] || {};
                                    const pickLogo = weekPickObj?.logo || teamMeta.logo;

                                    return (
                                        <tr key={row.user_id || idx} style={{
                                            borderBottom: "1px solid #f1f5f9",
                                            backgroundColor: isCurrentUser ? "#eff6ff" : (idx % 2 === 0 ? "#fafafa" : "white")
                                        }}>
                                            <td style={{
                                                padding: "12px 16px",
                                                fontWeight: isCurrentUser ? 800 : 600,
                                                fontSize: "14px",
                                                color: "#0f172a"
                                            }}>
                                                {row.entry_name} {isCurrentUser && "(You)"}
                                            </td>
                                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                                {pickedTeam ? (
                                                    <div style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                        background: isHidden ? "#f1f5f9" : (teamMeta.primaryColor || "#f1f5f9"),
                                                        color: isHidden ? "#64748b" : "#fff",
                                                        padding: "4px 10px",
                                                        borderRadius: 6,
                                                        border: `1px solid ${isHidden ? "#cbd5e1" : (teamMeta.secondaryColor || "#cbd5e1")}`
                                                    }}>
                                                        {!isHidden && pickLogo && (
                                                            <span style={{ background: teamMeta.secondaryColor || "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 3px", display: "inline-flex", alignItems: "center" }}>
                                                                <img src={pickLogo} alt={pickedTeam} style={{ width: 18, height: 18, objectFit: "contain" }} />
                                                            </span>
                                                        )}
                                                        <span style={{ fontWeight: 700, fontSize: "13px" }}>{pickedTeam}</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>No Pick Made</span>
                                                )}
                                            </td>
                                            <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, fontSize: "13px" }}>
                                                {row.is_eliminated ? (
                                                    <span style={{ color: NFL_RED }}>✕ Eliminated (W{row.eliminated_week})</span>
                                                ) : (
                                                    <span style={{ color: "#16a34a" }}>✓ Alive</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </PoolGatekeeper>
    );
}