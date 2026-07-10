import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import useAuth from "../../hooks/useAuth";

const GOLD = "#c89d3c";
const NAVY = "#13447a";
const WORLDCUPGREEN = "#226750";

const ROUND_LABELS = {
    1: "Round of 32",
    2: "Round of 16",
    3: "Quarterfinals",
    4: "Semifinals",
    5: "Championship"
};

export default function MyPicks() {
    const navigate = useNavigate(); // ✨ Instantiated native React router hook
    const { user: user, loading: authLoading } = useAuth();
    const [groupPicks, setGroupPicks] = useState([]);
    const [bracketPicks, setBracketPicks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
    const [activeSection, setActiveSection] = useState("group"); // Toggle between 'group' and 'bracket' views

    /* ---------------- DETECT MOBILE SCREEN VIEWPORTS ---------------- */
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    /* ---------------- FETCH PICKS & MATCHES ---------------- */
    useEffect(() => {
        if (!user) return;

        async function fetchMyPicksAndSchedule() {
            setLoading(true);
            try {
                // Fetch all user picks from database
                const picksRes = await axios.get("/api/worldcup/picks", {
                    params: { user_id: user.id },
                });

                // Fetch all matches (Group + Knockouts)
                const matchesRes = await axios.get("/api/worldcup/matches");
                const allMatches = matchesRes.data;
                console.log(allMatches)

                // Create lookups from user selections
                const userPicksMap = picksRes.data.reduce((acc, p) => {
                    acc[String(p.match_id || p.game_id)] = p.selection || p.pick;
                    return acc;
                }, {});

                // 1. COMPILE GROUP STAGE TRACKER (ROUND 0)
                const groupMatches = allMatches.filter(g => parseInt(g.round) === 0);
                const enrichedGroup = groupMatches.map((match) => {
                    const userSelection = userPicksMap[String(match.match_id)] || null;
                    let calculatedPoints = 0;
                    let pickStatus = "Pending";

                    if (userSelection) {
                        const s = match.status || "";
                        if (s.includes("FULL_TIME")) {
                            if (userSelection === match.result) {
                                pickStatus = "Correct";
                                calculatedPoints = match.result === "Draw"
                                    ? (match.draw_points_value || 2)
                                    : (match.points_value || 1);
                            } else {
                                pickStatus = "Incorrect";
                            }
                        } else if (s.includes("PROGRESS") || s.includes("HALF")) {
                            pickStatus = "Live";
                        }
                    }

                    return {
                        ...match,
                        my_selection: userSelection,
                        points_earned: calculatedPoints,
                        outcome_status: pickStatus
                    };
                });
                enrichedGroup.sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
                setGroupPicks(enrichedGroup);

                // 2. COMPILE KNOCKOUT BRACKET TRACKER (ROUNDS 1-5)
                const knockoutMatches = allMatches.filter(g => parseInt(g.round) > 0 && parseInt(g.round) <= 5);
                const enrichedBracket = knockoutMatches.map((match) => {
                    const userSelection = userPicksMap[String(match.match_id)] || null;
                    let calculatedPoints = 0;
                    let pickStatus = "Pending";

                    if (userSelection) {
                        const s = match.status || "";


                        if (s.includes("FINAL") || s.includes("FULL_TIME")) {
                            const realWinner = match.result === "Home" ? match.home_team :
                                match.result === "Away" ? match.away_team : null;

                            if (realWinner && userSelection === realWinner) {
                                pickStatus = "Correct";
                                calculatedPoints = match.points_value;
                            } else if (realWinner) {
                                pickStatus = "Incorrect";
                            }
                        } else if (s.includes("PROGRESS") || s.includes("HALF")) {
                            pickStatus = "Live";
                        }
                    }

                    return {
                        ...match,
                        my_selection: userSelection,
                        points_earned: calculatedPoints,
                        outcome_status: pickStatus
                    };
                });
                enrichedBracket.sort((a, b) => a.round - b.round || a.bracket_slot - b.bracket_slot);
                setBracketPicks(enrichedBracket);
                console.log("Bracket Picks Total:", bracketPicks.reduce((acc, p) => acc + (p.points_earned || 0), 0));

            } catch (err) {
                console.error("❌ Error compiling user picks dashboard data tree:", err);
                toast.error("Failed to load your personal predictions list");
            } finally {
                setLoading(false);
            }
        }

        fetchMyPicksAndSchedule();
    }, [user]);

    // Points Summaries Separations
    const groupTotal = useMemo(() => groupPicks.reduce((sum, item) => sum + item.points_earned, 0), [groupPicks]);
    const bracketTotal = useMemo(() => bracketPicks.reduce((sum, item) => sum + item.points_earned, 0), [bracketPicks]);
    const accumulatedTotal = groupTotal + bracketTotal;

    if (authLoading) return <div style={{ paddingTop: 100, textAlign: "center" }}>Verifying session…</div>;
    if (!user) return <div style={{ paddingTop: 100, textAlign: "center" }}><h3>Please log in to view your selections dashboard.</h3></div>;

    const currentDisplayPicks = activeSection === "group" ? groupPicks : bracketPicks;
    const hasPicksMade = currentDisplayPicks.some(p => p.my_selection);

    // ── EXTRACTION ENGINE FOR SWITCH STATE BOXES ─────────────────────────────
    const renderEmptyOrPendingState = () => {
        const BRACKET_SET_LOCK = new Date("2026-03-19T16:15:00Z");
        const isBracketSet = new Date() <= BRACKET_SET_LOCK;

        // Condition A: Looking at bracket tab, but it hasn't been set up/locked down yet
        if (activeSection === "bracket" && !isBracketSet) {
            return (
                <div style={{ padding: "40px 24px", textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1", margin: "0 8px" }}>
                    <span style={{ fontSize: "36px", display: "block", marginBottom: "12px" }}>⏳</span>
                    <p style={{ color: "#475569", fontWeight: 700, margin: "0 0 6px", fontSize: "15px" }}>Come back when the bracket is set</p>
                    <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>The group stages are still active. Bracket phase grids open up as soon as knockout spots lock down.</p>
                </div>
            );
        }

        // Condition B: Bracket phase IS active or we are on Group tab, and user sheet rows are blank
        return (
            <div style={{ padding: 40, textAlign: "center", background: activeSection === "bracket" ? "#fffdf5" : "#f9fafb", borderRadius: 12, border: `2px dashed ${activeSection === "bracket" ? GOLD : "#d1d5db"}`, margin: "0 8px" }}>
                <p style={{ color: "#6b7280", fontWeight: 600, marginBottom: 16 }}>
                    {activeSection === "bracket"
                        ? "No picks! The bracket is set but your prediction sheet is currently blank."
                        : "You have no submitted picks recorded for this section yet!"
                    }
                </p>
                <button
                    onClick={() => { navigate("/worldcup/picks"); }}
                    style={{
                        padding: "10px 20px", backgroundColor: activeSection === "group" ? WORLDCUPGREEN : GOLD, color: "white",
                        border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                    }}
                >
                    Go Fill Out Selections →
                </button>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", paddingLeft: "8px", paddingRight: "8px" }}>
            <Toaster />
            {/* Header Scoreboard Dashboard */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12, paddingRight: "8px", paddingLeft: "8px" }}>
                <div>
                    <h2 style={{ color: WORLDCUPGREEN, margin: 0, fontSize: "22px", fontWeight: 900 }}>🌎 My Prediction Center</h2>
                    <p style={{ color: "#6b7280", margin: "2px 0 0", fontSize: 13 }}>Manager: <strong>{user.name}</strong></p>
                </div>
                <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>GROUP STAGE</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: WORLDCUPGREEN }}>{groupTotal} <span style={{ fontSize: 11, fontWeight: 400 }}>pts</span></div>
                    </div>
                    <div style={{ borderLeft: "1px solid #cbd5e1", paddingLeft: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>BRACKET STAGE</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>{bracketTotal} <span style={{ fontSize: 11, fontWeight: 400 }}>pts</span></div>
                    </div>
                    <div style={{ borderLeft: "2px solid #94a3b8", paddingLeft: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#1e293b" }}>TOTAL POINTS</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>{accumulatedTotal}</div>
                    </div>
                </div>
                {(() => {
                    const finalNode = bracketPicks.find(p => parseInt(p.round) === 5);
                    if (!finalNode || !finalNode.my_selection || finalNode.my_selection === "TBD") return null;
                    const champLogo = finalNode.my_selection === finalNode.home_team ? finalNode.home_logo : finalNode.away_logo;
                    return (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderRadius: "20px", background: "rgba(200, 157, 60, 0.12)", border: `1px solid ${GOLD}`, boxShadow: "0 4px 12px rgba(200, 157, 60, 0.05)" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", letterSpacing: "0.5px" }}>MY CHAMP:</span>
                            {champLogo && <img src={champLogo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />}
                            <strong style={{ fontSize: 14, color: "#1e293b", fontWeight: 800 }}>{finalNode.my_selection}</strong>
                        </div>
                    );
                })()}
            </div>

            {/* Section View Switcher Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, padding: "0 8px" }}>
                <button
                    onClick={() => setActiveSection("group")}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: activeSection === "group" ? WORLDCUPGREEN : "#e2e8f0", color: activeSection === "group" ? "white" : "#475569" }}
                >
                    📊 Group Stage Selections ({groupPicks.filter(p => p.my_selection).length}/72)
                </button>
                <button
                    onClick={() => setActiveSection("bracket")}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", fontWeight: 700, border: "none", cursor: "pointer", backgroundColor: activeSection === "bracket" ? GOLD : "#e2e8f0", color: activeSection === "bracket" ? "white" : "#475569" }}
                >
                    🏆 Knockout Bracket Choices ({bracketPicks.filter(p => p.my_selection).length}/31)
                </button>
            </div>

            {loading ? (
                <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>Fetching prediction records...</p>
            ) : !hasPicksMade ? (
                /* ✨ MODIFIED: Now runs our conditional date filter engine */
                renderEmptyOrPendingState()
            ) : (
                /* DATA TABLE WRAPPER CONTAINER */
                <div style={{ overflow: "auto", maxHeight: "calc(100vh - 240px)", width: "100%", border: "1px solid #e5e7eb", borderRadius: "6px", WebkitOverflowScrolling: "touch", maxWidth: "800px", margin: "0 auto" }}>
                    <table style={{ borderCollapse: "separate", borderSpacing: 0, background: "white", width: "100%", fontSize: 13 }}>
                        <thead>
                            <tr>
                                <th style={{ ...thStyle, textAlign: "center" }}>
                                    Matchup
                                </th>
                                <th style={thStyle}>Real Status/Score</th>
                                <th style={{ ...thStyle, minWidth: isMobile ? "60px" : "130px" }}>My Choice</th>
                                <th style={thStyle}>Result</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>Earned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentDisplayPicks.map((p, i) => {
                                const isFinal = p.status?.includes("FINAL");
                                const badgeBg = p.outcome_status === "Correct" ? "#166534"
                                    : p.outcome_status === "Incorrect" ? "#991b1b"
                                        : p.outcome_status === "Live" ? "#1e40af" : "#475569";

                                const selectionText = activeSection === "group"
                                    ? (p.my_selection === "Home" ? p.home_team : p.my_selection === "Away" ? p.away_team : "Draw")
                                    : p.my_selection;

                                const selectionLogo = activeSection === "group"
                                    ? (p.my_selection === "Home" ? p.home_logo : p.my_selection === "Away" ? p.away_logo : null)
                                    : (p.my_selection === p.home_team ? p.home_logo : p.my_selection === p.away_team ? p.away_logo : null);

                                return (
                                    <tr key={p.match_id || i} style={{ backgroundColor: isFinal ? "#f9fafb" : "white" }}>
                                        <td style={{ position: "sticky", left: 0, zIndex: 2, backgroundColor: isFinal ? "#f1f5f9" : "#f8fafc", borderRight: `2px solid ${GOLD}`, borderBottom: "1px solid #e5e7eb", padding: "10px 8px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "11px" }}>
                                                    {/* Away Team */}
                                                    <img src={p.away_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                                                    {p.away_team || "TBD"}
                                                    <span style={{ color: "#9ca3af", fontWeight: 400 }}>@</span>
                                                    {/* Home Team */}
                                                    <img src={p.home_logo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />
                                                    {p.home_team || "TBD"}
                                                </div>

                                                {/* Real Winner Label */}
                                                {p.outcome_status !== "Pending" && p.result !== "Draw" && (
                                                    <div style={{ fontSize: 9, color: WORLDCUPGREEN, fontWeight: 800 }}>
                                                        Winner: {p.result === "Home" ? p.home_team : p.away_team}
                                                    </div>
                                                )}

                                                {/* Stage Label */}
                                                <div style={{ fontSize: 9, color: "#64748b", fontWeight: 500 }}>
                                                    {activeSection === "group" ? p.group_name : ROUND_LABELS[p.round]}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center", fontFamily: "monospace", fontWeight: 700 }}>
                                            {p.status === "STATUS_SCHEDULED" ? (
                                                <span style={{ color: "#9ca3af", fontSize: "11px", fontWeight: 400 }}>
                                                    {new Date(p.game_date).toLocaleDateString([], { month: "short", day: "numeric" })}
                                                </span>
                                            ) : (
                                                `${p.away_score} - ${p.home_score}`
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>
                                            {p.my_selection ? (
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                                    {selectionLogo && <img src={selectionLogo} alt="" style={{ height: 14, width: 20, objectFit: "contain" }} />}
                                                    <span style={{ fontSize: "11px", color: activeSection === "group" ? "#1e293b" : GOLD }}>
                                                        {selectionText}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span style={{ color: "#cbd5e1" }}>–</span>
                                            )}
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "center" }}>
                                            <span style={{ padding: "2px 6px", borderRadius: "10px", color: "white", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", backgroundColor: badgeBg, display: "inline-block" }}>
                                                {p.outcome_status}
                                            </span>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: p.points_earned > 0 ? "#16a34a" : "#64748b", fontSize: "14px" }}>
                                            +{p.points_earned}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const thStyle = {
    position: "sticky",
    top: 0,
    zIndex: 8,
    backgroundColor: "#13447a",
    color: "white",
    borderBottom: `2px solid ${GOLD}`,
    padding: "12px 8px",
    whiteSpace: "nowrap",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    textAlign: "center"
};

const tdStyle = {
    padding: "10px 8px",
    verticalAlign: "middle",
    borderBottom: "1px solid #f3f4f6",
    borderRight: "1px solid #f3f4f6",
    whiteSpace: "nowrap"
};